using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Features.Users.Commands.SyncUser;

public record SyncUserResultDto(Guid UserId, bool WasCreated);

public record SyncUserCommand(string FirebaseUid, string Email)
    : ICommand<Result<SyncUserResultDto>>;

public class SyncUserCommandValidator : AbstractValidator<SyncUserCommand>
{
    public SyncUserCommandValidator()
    {
        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Sincroniza um usuário autenticado no Firebase com o registro local no Postgres.
/// Deve ser chamado logo após o primeiro login no front-end. Idempotente: se duas
/// chamadas concorrentes tentarem criar o mesmo usuário, a colisão no índice único
/// de <see cref="User.ExternalAuthUid"/> é tratada como sucesso (não como erro),
/// já que o resultado desejado (usuário existir) já foi alcançado pela chamada concorrente.
/// </summary>
public class SyncUserCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<SyncUserCommand, Result<SyncUserResultDto>>
{
    public async ValueTask<Result<SyncUserResultDto>> Handle(
        SyncUserCommand request,
        CancellationToken cancellationToken
    )
    {
        var existingUser = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (existingUser is not null)
            return Result.Success(new SyncUserResultDto(existingUser.Id, false));

        var newUser = new User
        {
            ExternalAuthUid = request.FirebaseUid,
            Email = request.Email,
            Name = "Usuário do Hub",
        };

        dbContext.Users.Add(newUser);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            var raceWinner = await dbContext
                .Users.AsNoTracking()
                .FirstOrDefaultAsync(
                    user => user.ExternalAuthUid == request.FirebaseUid,
                    cancellationToken
                );

            if (raceWinner is not null)
                return Result.Success(new SyncUserResultDto(raceWinner.Id, false));

            throw;
        }

        return Result.Success(new SyncUserResultDto(newUser.Id, true));
    }
}
