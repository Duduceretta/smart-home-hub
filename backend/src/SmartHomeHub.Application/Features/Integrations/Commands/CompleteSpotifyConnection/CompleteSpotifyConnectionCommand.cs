using FluentValidation;
using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.CompleteSpotifyConnection;

public record CompleteSpotifyConnectionCommand(string State, string Code) : ICommand<Result>;

public class CompleteSpotifyConnectionCommandValidator
    : AbstractValidator<CompleteSpotifyConnectionCommand>
{
    public CompleteSpotifyConnectionCommandValidator()
    {
        RuleFor(command => command.State)
            .NotEmpty()
            .WithMessage("O parâmetro state é obrigatório.");
        RuleFor(command => command.Code).NotEmpty().WithMessage("O parâmetro code é obrigatório.");
    }
}

public class CompleteSpotifyConnectionCommandHandler(
    ISpotifyOAuthStateStore stateStore,
    ISpotifyMediaService spotifyMediaService
) : ICommandHandler<CompleteSpotifyConnectionCommand, Result>
{
    public async ValueTask<Result> Handle(
        CompleteSpotifyConnectionCommand request,
        CancellationToken cancellationToken
    )
    {
        var firebaseUid = stateStore.ConsumeState(request.State);

        if (firebaseUid is null)
            return Result.Failure(
                new Error(
                    "Spotify.InvalidState",
                    "Sessão de conexão com o Spotify inválida ou expirada. Tente novamente."
                )
            );

        await spotifyMediaService.ExchangeCodeForTokensAsync(
            firebaseUid,
            request.Code,
            cancellationToken
        );

        return Result.Success();
    }
}
