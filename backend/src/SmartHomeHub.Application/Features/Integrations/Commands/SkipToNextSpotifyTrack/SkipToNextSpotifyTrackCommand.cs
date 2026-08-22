using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.SkipToNextSpotifyTrack;

public record SkipToNextSpotifyTrackCommand(string FirebaseUid) : ICommand<Result>;

public class SkipToNextSpotifyTrackCommandValidator : AbstractValidator<SkipToNextSpotifyTrackCommand>
{
    public SkipToNextSpotifyTrackCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class SkipToNextSpotifyTrackCommandHandler(ISpotifyMediaService spotifyMediaService)
    : ICommandHandler<SkipToNextSpotifyTrackCommand, Result>
{
    public async ValueTask<Result> Handle(
        SkipToNextSpotifyTrackCommand request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await spotifyMediaService.SkipToNextAsync(request.FirebaseUid, cancellationToken);
        }
        catch (DeviceCommunicationException ex)
        {
            return Result.Failure(new Error(ex.Code, ex.Message));
        }

        return Result.Success();
    }
}
