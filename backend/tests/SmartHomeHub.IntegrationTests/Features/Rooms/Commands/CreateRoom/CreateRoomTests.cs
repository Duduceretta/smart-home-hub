using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Commands.CreateRoom;

public class CreateRoomTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record CreateRoomRequest(string Name, string Icon);

    [Fact]
    public async Task CreateRoom_WithValidInput_ShouldPersistAndReturnCreated()
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
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateRoomRequest("Sala de Estar", "couch-icon");

        var response = await Client.PostAsJsonAsync(
            "/api/rooms",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        response.Headers.Location.Should().NotBeNull();

        var physicalRoom = await DbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Name == request.Name && room.UserId == userId,
                cancellationToken: TestContext.Current.CancellationToken
            );

        physicalRoom.Should().NotBeNull("A sala deveria ter sido salva no banco de dados.");
        physicalRoom.Icon.Should().Be("couch-icon");
        physicalRoom.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task CreateRoom_WithNonExistentUser_ShouldReturnBadRequest()
    {
        var request = new CreateRoomRequest("Garagem", "car-icon");

        var response = await Client.PostAsJsonAsync(
            "/api/rooms",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var errorResponse = await response.Content.ReadFromJsonAsync<dynamic>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        string errorCode = errorResponse!.GetProperty("error").GetString();
        errorCode.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task CreateRoom_WithEmptyName_ShouldReturnBadRequest()
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
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateRoomRequest("", "couch-icon");

        var response = await Client.PostAsJsonAsync(
            "/api/rooms",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var roomCount = await DbContext.Rooms.CountAsync(TestContext.Current.CancellationToken);
        roomCount.Should().Be(0, "Nenhuma sala poderia ter sido criada com um nome vazio.");
    }

    [Fact]
    public async Task CreateRoom_WithEmptyIcon_ShouldReturnBadRequest()
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
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateRoomRequest("Cozinha", "");

        var response = await Client.PostAsJsonAsync(
            "/api/rooms",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var roomCount = await DbContext.Rooms.CountAsync(TestContext.Current.CancellationToken);
        roomCount.Should().Be(0, "A sala não pode ser salva sem um ícone válido.");
    }
}
