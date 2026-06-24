using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRoomById;

public class GetRoomByIdTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record RoomResponse(Guid Id, string Name, string? Icon);

    [Fact]
    public async Task GetRoomById_WithValidIdAndOwner_ShouldReturnOkAndData()
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
            Name = "Quarto Principal",
            Icon = "bed-icon",
            UserId = userId,
            IsDeleted = false,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{roomId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var roomResponse = await response.Content.ReadFromJsonAsync<RoomResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        roomResponse.Should().NotBeNull();
        roomResponse.Id.Should().Be(roomId);
        roomResponse.Name.Should().Be("Quarto Principal");
        roomResponse.Icon.Should().Be("bed-icon");
    }

    [Fact]
    public async Task GetRoomById_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            Email = "hacker@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var victimId = Guid.NewGuid();
        var victimUser = new User
        {
            Id = victimId,
            Name = "Vítima",
            ExternalAuthUid = "token-vitima",
        };

        var victimRoomId = Guid.NewGuid();
        var victimRoom = new Room
        {
            Id = victimRoomId,
            Name = "Cofre Particular",
            UserId = victimId,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{victimRoomId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
