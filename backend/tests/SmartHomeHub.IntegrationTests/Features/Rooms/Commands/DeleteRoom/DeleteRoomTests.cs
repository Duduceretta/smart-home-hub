using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Commands.DeleteRoom;

public class DeleteRoomTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteRoom_ShouldSoftDelete_AndHideFromCommonQueries()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };
        DbContext.Users.Add(user);

        var roomId = Guid.NewGuid();
        var room = new Room
        {
            Id = roomId,
            Name = "Laboratório de Eletrônica",
            IsDeleted = false,
            UserId = userId,
        };
        DbContext.Rooms.Add(room);

        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var deleteResponse = await Client.DeleteAsync(
            $"/api/rooms/{roomId}",
            TestContext.Current.CancellationToken
        );

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await Client.GetAsync(
            $"/api/rooms/{roomId}",
            TestContext.Current.CancellationToken
        );
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalRoom = await DbContext
            .Rooms.AsNoTracking()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                room => room.Id == roomId,
                cancellationToken: TestContext.Current.CancellationToken
            );

        physicalRoom
            .Should()
            .NotBeNull("O registro NÃO pode ser apagado fisicamente do banco de dados!");

        physicalRoom
            .IsDeleted.Should()
            .BeTrue("A flag IsDeleted não foi alterada para true pelo Interceptador.");
    }
}
