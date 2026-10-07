using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Scenes.Queries.GetSceneStats;

public record SceneTopDto(Guid SceneId, string Name, int Activations);

public record SceneLastProblemDto(
    Guid? SceneId,
    string? SceneName,
    DateTimeOffset Timestamp,
    string Description
);

/// <param name="ActivationsPerDay">Ativações por dia nos últimos 7 dias (dia do usuário), do mais antigo para hoje.</param>
/// <param name="PreviousActivationsTotal">Ativações nos 7 dias anteriores, para a variação.</param>
/// <param name="SuccessRate">0-100: ativações sem alerta (nenhuma falha nem dispositivo offline). Null sem ativações.</param>
/// <param name="PeakHour">Hora do dia (do usuário) com mais ativações, "HH:00". Null sem ativações.</param>
/// <param name="LastProblem">Última ativação com alerta nas duas semanas, se houver.</param>
public record SceneStatsDto(
    int[] ActivationsPerDay,
    int ActivationsTotal,
    int PreviousActivationsTotal,
    double? SuccessRate,
    List<SceneTopDto> TopScenes,
    string? PeakHour,
    SceneLastProblemDto? LastProblem
);

/// <summary>
/// Estatísticas das ativações de cena do usuário. Query de agregação dedicada (não segue
/// IPagedQuery, como as de estatística do histórico): os números nunca vêm da página de cenas
/// carregada na tela. <paramref name="TimeZone"/> é um id IANA ("America/Sao_Paulo"); sem ele
/// vale UTC. É dele que saem a virada do dia e o horário de pico.
/// </summary>
public record GetSceneStatsQuery(string FirebaseUid, string? TimeZone)
    : IQuery<Result<SceneStatsDto>>;

public class GetSceneStatsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetSceneStatsQuery, Result<SceneStatsDto>>
{
    private const int WindowDays = 7;
    private const int TopScenesCount = 3;

    // Teto de segurança da leitura (14 dias de ativações de um usuário ficam muito abaixo
    // disso); evita varrer a tabela inteira se algo gerar eventos em excesso.
    private const int MaxEventsScanned = 10_000;

    public async ValueTask<Result<SceneStatsDto>> Handle(
        GetSceneStatsQuery request,
        CancellationToken cancellationToken
    )
    {
        if (!TryResolveTimeZone(request.TimeZone, out var zone))
        {
            return Result.Failure<SceneStatsDto>(
                new Error(
                    "Stats.InvalidTimeZone",
                    "Fuso horário inválido. Use um identificador como \"America/Sao_Paulo\"."
                )
            );
        }

        var todayLocal = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).Date;
        var windowStartLocal = todayLocal.AddDays(-(WindowDays - 1));
        var windowStartUtc = StartOfDayUtc(windowStartLocal, zone);
        var previousStartUtc = StartOfDayUtc(windowStartLocal.AddDays(-WindowDays), zone);

        // Só as colunas usadas, com filtro de usuário, tipo e intervalo de tempo (14 dias).
        // O agrupamento por dia e por hora é feito aqui, e não em SQL, para respeitar o horário
        // de verão do fuso do usuário; o conjunto lido é pequeno e limitado.
        var events = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(e =>
                e.User.ExternalAuthUid == request.FirebaseUid
                && e.EventType == SystemEventTypes.SceneActivated
                && e.Timestamp >= previousStartUtc
            )
            .OrderByDescending(e => e.Timestamp)
            .Take(MaxEventsScanned)
            .Select(e => new ActivationRow(
                e.Timestamp,
                e.SceneId,
                e.SceneName,
                e.Severity,
                e.Description
            ))
            .ToListAsync(cancellationToken);

        var current = events
            .Where(e => e.Timestamp >= windowStartUtc)
            .Select(e => (Row: e, Local: TimeZoneInfo.ConvertTime(e.Timestamp, zone)))
            .Where(e => (e.Local.Date - windowStartLocal).Days is >= 0 and < WindowDays)
            .ToList();
        var previousTotal = events.Count(e => e.Timestamp < windowStartUtc);

        var perDay = new int[WindowDays];
        foreach (var (_, local) in current)
            perDay[(local.Date - windowStartLocal).Days]++;

        double? successRate =
            current.Count == 0
                ? null
                : Math.Round(
                    current.Count(e => e.Row.Severity == EventSeverity.Info)
                        * 100.0
                        / current.Count,
                    1
                );

        var peakHour = current
            .GroupBy(e => e.Local.Hour)
            .OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key)
            .Select(group => $"{group.Key:00}:00")
            .FirstOrDefault();

        var topScenes = await BuildTopScenesAsync(current.Select(e => e.Row), cancellationToken);

        var lastProblem = events
            .Where(e => e.Severity != EventSeverity.Info)
            .Select(e => new SceneLastProblemDto(
                e.SceneId,
                e.SceneName,
                e.Timestamp,
                e.Description
            ))
            .FirstOrDefault();

        return Result.Success(
            new SceneStatsDto(
                perDay,
                perDay.Sum(),
                previousTotal,
                successRate,
                topScenes,
                peakHour,
                lastProblem
            )
        );
    }

    // Nome atual da cena; se ela foi apagada, o retrato gravado no evento mais recente.
    private async Task<List<SceneTopDto>> BuildTopScenesAsync(
        IEnumerable<ActivationRow> rows,
        CancellationToken cancellationToken
    )
    {
        var ranked = rows.Where(r => r.SceneId is not null)
            .GroupBy(r => r.SceneId!.Value)
            .Select(group =>
                (
                    SceneId: group.Key,
                    Count: group.Count(),
                    Snapshot: group.OrderByDescending(r => r.Timestamp).First().SceneName
                )
            )
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Snapshot, StringComparer.OrdinalIgnoreCase)
            .Take(TopScenesCount)
            .ToList();

        if (ranked.Count == 0)
            return [];

        var ids = ranked.Select(item => item.SceneId).ToList();
        var currentNames = await dbContext
            .Scenes.AsNoTracking()
            .Where(scene => ids.Contains(scene.Id))
            .ToDictionaryAsync(scene => scene.Id, scene => scene.Name, cancellationToken);

        return ranked
            .Select(item => new SceneTopDto(
                item.SceneId,
                currentNames.GetValueOrDefault(item.SceneId) ?? item.Snapshot ?? string.Empty,
                item.Count
            ))
            .ToList();
    }

    private static bool TryResolveTimeZone(string? id, out TimeZoneInfo zone)
    {
        zone = TimeZoneInfo.Utc;

        if (id is null)
            return true;

        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById(id.Trim());
            return true;
        }
        catch (Exception ex)
            when (ex is TimeZoneNotFoundException or InvalidTimeZoneException or ArgumentException)
        {
            return false;
        }
    }

    // Meia-noite local em UTC; se o fuso pula essa hora (início do horário de verão), vale a
    // primeira hora válida do dia.
    private static DateTimeOffset StartOfDayUtc(DateTime localDate, TimeZoneInfo zone)
    {
        var start = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);

        while (zone.IsInvalidTime(start))
            start = start.AddHours(1);

        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(start, zone), TimeSpan.Zero);
    }

    private sealed record ActivationRow(
        DateTimeOffset Timestamp,
        Guid? SceneId,
        string? SceneName,
        EventSeverity Severity,
        string Description
    );
}
