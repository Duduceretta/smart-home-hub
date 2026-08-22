using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.SetSpotifyVolume;

public record SetSpotifyVolumeCommand(string FirebaseUid, int VolumePercent) : ICommand<Result>;

public class SetSpotifyVolumeCommandValidator : AbstractValidator<SetSpotifyVolumeCommand>
{
    public SetSpotifyVolumeCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.VolumePercent)
            .InclusiveBetween(0, 100)
            .WithMessage("O volume deve estar entre 0 e 100.");
    }
}

public class SetSpotifyVolumeCommandHandler(ISpotifyMediaService spotifyMediaService)
    : ICommandHandler<SetSpotifyVolumeCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetSpotifyVolumeCommand request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await spotifyMediaService.SetVolumeAsync(
                request.FirebaseUid,
                request.VolumePercent,
                cancellationToken
            );
        }
        catch (DeviceCommunicationException ex)
        {
            return Result.Failure(new Error(ex.Code, ex.Message));
        }

        return Result.Success();
    }
}
