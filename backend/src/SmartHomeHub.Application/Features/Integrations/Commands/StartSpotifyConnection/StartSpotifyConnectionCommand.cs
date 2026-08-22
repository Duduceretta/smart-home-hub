using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.StartSpotifyConnection;

public record StartSpotifyConnectionCommand(string FirebaseUid) : ICommand<Result<string>>;

public class StartSpotifyConnectionCommandValidator : AbstractValidator<StartSpotifyConnectionCommand>
{
    public StartSpotifyConnectionCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class StartSpotifyConnectionCommandHandler(
    ISpotifyOAuthStateStore stateStore,
    ISpotifyMediaService spotifyMediaService
) : ICommandHandler<StartSpotifyConnectionCommand, Result<string>>
{
    public ValueTask<Result<string>> Handle(
        StartSpotifyConnectionCommand request,
        CancellationToken cancellationToken
    )
    {
        var state = stateStore.CreateState(request.FirebaseUid);
        var authorizeUrl = spotifyMediaService.BuildAuthorizeUrl(state);

        return ValueTask.FromResult(Result.Success(authorizeUrl));
    }
}
