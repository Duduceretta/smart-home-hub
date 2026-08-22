using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.SkipToPreviousSpotifyTrack;

public record SkipToPreviousSpotifyTrackCommand(string FirebaseUid) : ICommand<Result>;

public class SkipToPreviousSpotifyTrackCommandValidator
    : AbstractValidator<SkipToPreviousSpotifyTrackCommand>
{
    public SkipToPreviousSpotifyTrackCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class SkipToPreviousSpotifyTrackCommandHandler(ISpotifyMediaService spotifyMediaService)
    : ICommandHandler<SkipToPreviousSpotifyTrackCommand, Result>
{
    public async ValueTask<Result> Handle(
        SkipToPreviousSpotifyTrackCommand request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await spotifyMediaService.SkipToPreviousAsync(request.FirebaseUid, cancellationToken);
        }
        catch (DeviceCommunicationException ex)
        {
            return Result.Failure(new Error(ex.Code, ex.Message));
        }

        return Result.Success();
    }
}
