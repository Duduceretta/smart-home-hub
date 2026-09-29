using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Users.Commands.UpdateUserLocation;

public record UpdateUserLocationCommand(string FirebaseUid, double Latitude, double Longitude)
    : ICommand<Result>;

public class UpdateUserLocationCommandValidator : AbstractValidator<UpdateUserLocationCommand>
{
    public UpdateUserLocationCommandValidator()
    {
        RuleFor(x => x.FirebaseUid).NotEmpty();
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .WithMessage("Latitude deve estar entre -90 e 90.");
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .WithMessage("Longitude deve estar entre -180 e 180.");
    }
}

/// <summary>
/// Salva a localização da residência — capturada uma única vez no frontend
/// (geolocalização do navegador, com consentimento explícito do usuário) e
/// nunca mais re-perguntada. Fonte de verdade pro clima real do hero da Home.
/// </summary>
public class UpdateUserLocationCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateUserLocationCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateUserLocationCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(
            u => u.ExternalAuthUid == request.FirebaseUid,
            cancellationToken
        );

        if (user is null)
        {
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));
        }

        user.Latitude = request.Latitude;
        user.Longitude = request.Longitude;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
