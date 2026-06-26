using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
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

    [Fact]
    public async Task DeleteRoom_OwnedByAnotherUser_ShouldReturnNotFound()
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

        var response = await Client.DeleteAsync(
            $"/api/rooms/{victimRoomId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalRoom = await DbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == victimRoomId,
                TestContext.Current.CancellationToken
            );

        physicalRoom.Should().NotBeNull("A sala não pode ser deletada por outro usuário.");
        physicalRoom.IsDeleted.Should().BeFalse("A sala não pode ser deletada por outro usuário.");
    }

    [Fact]
    public async Task DeleteRoom_WhenAlreadyDeleted_ShouldReturnNotFound()
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
            Name = "Sala Antiga",
            UserId = userId,
            IsDeleted = true,
        };

        DbContext.Users.Add(user);

        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/rooms/{roomId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteRoom_ShouldSetNull_OnAssociatedDevices()
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
            UserId = userId,
            Name = "Sala de Teste Cascade",
            IsDeleted = false,
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            RoomId = roomId,
            Name = "Lâmpada da Sala",
            Brand = "Philips",
            ExternalId = "MAC-CASCADE-TEST",
            Type = DeviceType.Light,
            IsDeleted = false,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/rooms/{roomId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();

        var physicalDevice = await DbContext
            .Devices.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                device => device.Id == deviceId,
                TestContext.Current.CancellationToken
            );

        physicalDevice.Should().NotBeNull("O dispositivo não pode desaparecer do banco.");

        physicalDevice
            .IsDeleted.Should()
            .BeFalse(
                "A exclusão da sala NÃO deve deletar o dispositivo fisicamente ou logicamente."
            );

        physicalDevice
            .RoomId.Should()
            .BeNull("Como a sala foi deletada, o RoomId do dispositivo deve ficar nulo.");
    }
}
