using System.Linq.Expressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Scenes.Common;

/// <summary>
/// Estado desejado de um dispositivo dentro de uma cena. <c>null</c> em um atributo
/// significa "a cena não mexe nesse atributo".
/// </summary>
public record SceneItemInput(
    Guid DeviceId,
    bool IsOn,
    int? Brightness = null,
    string? ColorHex = null,
    int? ColorTempPercent = null
);

public class SceneItemInputValidator : AbstractValidator<SceneItemInput>
{
    public SceneItemInputValidator()
    {
        RuleFor(item => item.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(item => item.Brightness)
            .InclusiveBetween(0, 100)
            .When(item => item.Brightness is not null)
            .WithMessage("O brilho deve estar entre 0 e 100.");

        RuleFor(item => item.ColorHex)
            .Matches("^#[0-9A-Fa-f]{6}$")
            .When(item => item.ColorHex is not null)
            .WithMessage("A cor deve estar no formato hexadecimal #RRGGBB.");

        RuleFor(item => item.ColorTempPercent)
            .InclusiveBetween(0, 100)
            .When(item => item.ColorTempPercent is not null)
            .WithMessage("A temperatura de cor deve estar entre 0 e 100.");
    }
}

public static class SceneValidationRules
{
    /// <summary>
    /// Regras de formato compartilhadas por criar e atualizar cena.
    /// </summary>
    public static void AddSceneRules<T>(
        this AbstractValidator<T> validator,
        Expression<Func<T, string>> name,
        Expression<Func<T, string?>> icon,
        Expression<Func<T, IEnumerable<SceneItemInput>>> items
    )
    {
        validator
            .RuleFor(name)
            .NotEmpty()
            .WithMessage("O nome da cena é obrigatório.")
            .MaximumLength(100)
            .WithMessage("O nome da cena deve ter no máximo 100 caracteres.");

        validator
            .RuleFor(icon)
            .MaximumLength(50)
            .WithMessage("O nome do ícone deve ter no máximo 50 caracteres.");

        validator
            .RuleFor(items)
            .NotEmpty()
            .WithMessage("A cena precisa ter pelo menos um dispositivo.");

        validator
            .RuleFor(items)
            .Must(list =>
                list is null || list.Select(i => i.DeviceId).Distinct().Count() == list.Count()
            )
            .WithMessage("Um dispositivo só pode aparecer uma vez por cena.");

        validator.RuleForEach(items).SetValidator(new SceneItemInputValidator());
    }
}

/// <summary>
/// Regras de estado (dispositivo existe, é do usuário, é controlável) e sincronização dos
/// itens de uma cena — compartilhadas por criar e atualizar.
/// </summary>
public static class SceneItemsSynchronizer
{
    // Dispositivos que não aceitam comando de estado (sensor, câmera) ou que ficam fora
    // do MVP por segurança (fechadura, alarme) — mesma restrição da Alexa para cenas.
    private static readonly HashSet<DeviceType> UnsupportedTypes =
    [
        DeviceType.Sensor,
        DeviceType.Camera,
        DeviceType.Lock,
        DeviceType.Alarm,
    ];

    public static async Task<Result> ValidateDevicesAsync(
        IAppDbContext dbContext,
        Guid userId,
        IReadOnlyCollection<SceneItemInput> inputs,
        CancellationToken cancellationToken
    )
    {
        var deviceIds = inputs.Select(input => input.DeviceId).ToList();

        var devices = await dbContext
            .Devices.AsNoTracking()
            .Where(device => deviceIds.Contains(device.Id) && device.UserId == userId)
            .Select(device => new
            {
                device.Id,
                device.Type,
                device.IntegrationType,
            })
            .ToListAsync(cancellationToken);

        if (devices.Count != deviceIds.Count)
            return Result.Failure(
                new Error(
                    "Scene.InvalidDevices",
                    "Um ou mais dispositivos informados não existem ou não pertencem à sua conta."
                )
            );

        var deviceById = devices.ToDictionary(device => device.Id);

        foreach (var input in inputs)
        {
            var device = deviceById[input.DeviceId];
            var type = device.Type;

            if (UnsupportedTypes.Contains(type))
                return Result.Failure(
                    new Error(
                        "Scene.Validation.UnsupportedDeviceType",
                        "Sensores, câmeras, fechaduras e alarmes não podem fazer parte de uma cena."
                    )
                );

            var hasLightAttributes =
                input.Brightness is not null
                || input.ColorHex is not null
                || input.ColorTempPercent is not null;

            // Mesma condição de SetDeviceBrightness/Color/ColorTemp: só luz Tuya local
            // aceita esses comandos. Barrar aqui evita salvar uma cena que a ativação
            // nunca conseguiria aplicar.
            var supportsLightAttributes =
                type == DeviceType.Light && device.IntegrationType == IntegrationType.TuyaLocal;

            if (hasLightAttributes && !supportsLightAttributes)
                return Result.Failure(
                    new Error(
                        "Scene.Validation.UnsupportedAttributes",
                        "Brilho, cor e temperatura de cor só podem ser definidos para luzes Tuya com controle local."
                    )
                );
        }

        return Result.Success();
    }

    /// <summary>
    /// Sincroniza os itens da cena com a lista recebida: atualiza os existentes, adiciona os
    /// novos e remove os que saíram. Atualizar no lugar evita conflito do índice único
    /// (SceneId, DeviceId) que um "apaga tudo e recria" poderia causar.
    /// </summary>
    public static void Apply(
        IAppDbContext dbContext,
        Scene scene,
        IReadOnlyCollection<SceneItemInput> inputs
    )
    {
        var existingByDevice = scene.Items.ToDictionary(item => item.DeviceId);

        foreach (var input in inputs)
        {
            if (existingByDevice.Remove(input.DeviceId, out var item))
            {
                item.IsOn = input.IsOn;
                item.Brightness = input.Brightness;
                item.ColorHex = input.ColorHex;
                item.ColorTempPercent = input.ColorTempPercent;
                continue;
            }

            // Add explícito no DbSet: o item já nasce com Id (Guid.NewGuid) e, adicionado só
            // à coleção de uma Scene já rastreada, o EF o trataria como existente (UPDATE
            // em 0 linhas -> DbUpdateConcurrencyException) em vez de INSERT.
            dbContext.SceneItems.Add(
                new SceneItem
                {
                    SceneId = scene.Id,
                    DeviceId = input.DeviceId,
                    IsOn = input.IsOn,
                    Brightness = input.Brightness,
                    ColorHex = input.ColorHex,
                    ColorTempPercent = input.ColorTempPercent,
                }
            );
        }

        foreach (var staleItem in existingByDevice.Values)
            dbContext.SceneItems.Remove(staleItem);
    }
}
