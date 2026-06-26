using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Commands.UpdateRoom;

public class UpdateRoomTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record UpdateRoomRequest(string Name, string Icon);

    [Fact]
    public async Task UpdateRoom_WithValidData_ShouldUpdateAndReturnOk()
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

        var roomId = Guid.NewGuid();
        var room = new Room
        {
            Id = roomId,
            Name = "Nome Antigo",
            Icon = "icone-velho",
            UserId = userId,
            IsDeleted = false,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateRoomRequest("Nome Atualizado", "icone-novo");

        var response = await Client.PutAsJsonAsync(
            $"/api/rooms/{roomId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalRoom = await DbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(room => room.Id == roomId, TestContext.Current.CancellationToken);

        physicalRoom.Should().NotBeNull();
        physicalRoom.Name.Should().Be("Nome Atualizado");
        physicalRoom.Icon.Should().Be("icone-novo");
    }

    [Fact]
    public async Task UpdateRoom_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Hacker Silva",
            Email = "hacker@malicioso.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };

        var victimId = Guid.NewGuid();
        var victimUser = new User
        {
            Id = victimId,
            Name = "Vítima",
            Email = "vitima@inocente.com",
            ExternalAuthUid = "token-da-vitima",
            IsDeleted = false,
        };

        var victimRoomId = Guid.NewGuid();
        var victimRoom = new Room
        {
            Id = victimRoomId,
            Name = "Cofre",
            Icon = "safe",
            UserId = victimId,
            IsDeleted = false,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateRoomRequest("Hacked", "skull-icon");

        var response = await Client.PutAsJsonAsync(
            $"/api/rooms/{victimRoomId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalRoom = await DbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == victimRoomId,
                TestContext.Current.CancellationToken
            );

        physicalRoom.Should().NotBeNull("A sala não pode ser alterada por outro usuário.");
        physicalRoom.Name.Should().Be("Cofre", "A sala não pode ser alterada por outro usuário.");
    }

    [Fact]
    public async Task UpdateRoom_WithMissingName_ShouldReturnBadRequest()
    {
        var roomId = Guid.NewGuid();
        var request = new UpdateRoomRequest("", "new-icon");

        var response = await Client.PutAsJsonAsync(
            $"/api/rooms/{roomId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
