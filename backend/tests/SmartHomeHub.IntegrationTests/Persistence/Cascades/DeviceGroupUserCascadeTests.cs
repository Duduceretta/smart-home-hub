using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Persistence.Cascades;

// Cobre a auditoria de banco: DeviceGroup.UserId virou Restrict (migration
// RestrictDeviceGroupUserCascade) por simetria com Device/Room.UserId
// (RestrictUserCascades) — mesma classe de metadado, mesma política. O
// soft-delete nunca aciona a constraint física; este teste cobre o caminho
// que ela protege de verdade: acesso direto ao banco por fora do AppDbContext.
public class DeviceGroupUserCascadeTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteUser_ViaRawSql_WithLinkedDeviceGroup_ShouldBeBlockedByForeignKeyConstraint()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Cozinha",
        };

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Users\" WHERE \"Id\" = {0}",
                [user.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception
            .Which.SqlState.Should()
            .Be(
                "23503",
                "violação de foreign key (foreign_key_violation) — o DELETE físico direto deve ser bloqueado, não cascatear."
            );

        (await DbContext.Users.FindAsync([user.Id], TestContext.Current.CancellationToken))
            .Should()
            .NotBeNull("o Restrict deve impedir o DELETE de acontecer, o User continua existindo.");
    }
}
