using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRooms;

public class GetRoomsTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record RoomResponse(Guid Id, string Name, string? Icon);

    [Fact]
    public async Task GetRooms_ShouldReturnOnlyRooms_OwnedByTheLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            Email = "vizinho@smarthome.com",
            ExternalAuthUid = "vizinho-token",
            IsDeleted = false,
        };

        var myRoom1 = new Room
        {
            Id = Guid.NewGuid(),
            Name = "Minha Sala 1",
            UserId = loggedUser.Id,
        };
        var myRoom2 = new Room
        {
            Id = Guid.NewGuid(),
            Name = "Minha Sala 2",
            UserId = loggedUser.Id,
        };

        var otherRoom = new Room
        {
            Id = Guid.NewGuid(),
            Name = "Sala do Vizinho",
            UserId = otherUser.Id,
        };

        var deletedRoom = new Room
        {
            Id = Guid.NewGuid(),
            Name = "Sala Deletada",
            UserId = loggedUser.Id,
            IsDeleted = true,
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Rooms.AddRange(myRoom1, myRoom2, otherRoom, deletedRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync("/api/rooms", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var rooms = await response.Content.ReadFromJsonAsync<List<RoomResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        rooms.Should().NotBeNull();

        rooms.Should().HaveCount(2);

        var returnedIds = rooms.Select(room => room.Id).ToList();
        returnedIds.Should().Contain(myRoom1.Id);
        returnedIds.Should().Contain(myRoom2.Id);
        returnedIds.Should().NotContain(otherRoom.Id);
        returnedIds.Should().NotContain(deletedRoom.Id);
    }
}
