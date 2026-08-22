using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Integrations.Commands.DisconnectSpotify;

public record DisconnectSpotifyCommand(string FirebaseUid) : ICommand<Result>;

public class DisconnectSpotifyCommandValidator : AbstractValidator<DisconnectSpotifyCommand>
{
    public DisconnectSpotifyCommandValidator()
    {
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class DisconnectSpotifyCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<DisconnectSpotifyCommand, Result>
{
    public async ValueTask<Result> Handle(
        DisconnectSpotifyCommand request,
        CancellationToken cancellationToken
    )
    {
        var integration = await dbContext
            .SpotifyIntegrations.Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (integration is null)
            return Result.Success();

        dbContext.SpotifyIntegrations.Remove(integration);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
