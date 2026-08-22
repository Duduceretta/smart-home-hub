using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.ToggleSpotifyPlayback;

public record ToggleSpotifyPlaybackCommand(string FirebaseUid) : ICommand<Result>;

public class ToggleSpotifyPlaybackCommandValidator : AbstractValidator<ToggleSpotifyPlaybackCommand>
{
    public ToggleSpotifyPlaybackCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class ToggleSpotifyPlaybackCommandHandler(ISpotifyMediaService spotifyMediaService)
    : ICommandHandler<ToggleSpotifyPlaybackCommand, Result>
{
    public async ValueTask<Result> Handle(
        ToggleSpotifyPlaybackCommand request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await spotifyMediaService.TogglePlayPauseAsync(request.FirebaseUid, cancellationToken);
        }
        catch (DeviceCommunicationException ex)
        {
            return Result.Failure(new Error(ex.Code, ex.Message));
        }

        return Result.Success();
    }
}
