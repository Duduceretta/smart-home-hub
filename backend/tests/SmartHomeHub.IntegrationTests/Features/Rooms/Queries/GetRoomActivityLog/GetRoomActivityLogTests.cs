using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRoomActivityLog;

public class GetRoomActivityLogTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record ActivityLogEntryResponse(
        Guid Id,
        Guid? DeviceId,
        string EventType,
        string Title,
        string Description,
        DateTimeOffset Timestamp
    );

    private record PagedResponse<T>(
        List<T> Items,
        int Page,
        int PageSize,
        int TotalCount,
        int TotalPages,
        bool HasNextPage,
        bool HasPreviousPage
    );

    [Fact]
    public async Task GetRoomActivityLog_ShouldReturnOnlyEventsFromDevicesInThisRoom_NewestFirst()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var targetRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Sala de Estar",
        };
        var otherRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Quarto",
        };

        var targetDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = targetRoom.Id,
            Name = "TV",
            Brand = "LG",
            ExternalId = "MAC-EVENTS-1",
            Type = DeviceType.Television,
        };
        var otherRoomDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = otherRoom.Id,
            Name = "Ar-Condicionado",
            Brand = "LG",
            ExternalId = "MAC-EVENTS-2",
            Type = DeviceType.Thermostat,
        };

        var now = DateTimeOffset.UtcNow;

        var olderEventInRoom = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceId = targetDevice.Id,
            EventType = "DeviceStatus",
            Title = "TV ligada",
            Description = "Ambiente: Sala de Estar",
            Timestamp = now.AddMinutes(-5),
        };
        var newerEventInRoom = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceId = targetDevice.Id,
            EventType = "DeviceStatus",
            Title = "TV desligada",
            Description = "Ambiente: Sala de Estar",
            Timestamp = now,
        };
        var eventInOtherRoom = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceId = otherRoomDevice.Id,
            EventType = "DeviceStatus",
            Title = "Ar-Condicionado ligado",
            Description = "Ambiente: Quarto — não deve aparecer.",
            Timestamp = now,
        };
        var deviceLessEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceId = null,
            EventType = "AutomationExecuted",
            Title = "Automação executada",
            Description = "Sem dispositivo associado — não deve aparecer em nenhum ambiente.",
            Timestamp = now,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.AddRange(targetRoom, otherRoom);
        DbContext.Devices.AddRange(targetDevice, otherRoomDevice);
        DbContext.SystemEvents.AddRange(
            olderEventInRoom,
            newerEventInRoom,
            eventInOtherRoom,
            deviceLessEvent
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{targetRoom.Id}/events",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<ActivityLogEntryResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().HaveCount(2, "só os eventos de dispositivos deste ambiente.");
        pagedResult
            .Items.Select(entry => entry.Title)
            .Should()
            .ContainInOrder("TV desligada", "TV ligada");
    }

    [Fact]
    public async Task GetRoomActivityLog_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var room = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Escritório",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Luz",
            Brand = "Philips",
            ExternalId = "MAC-EVENTS-3",
            Type = DeviceType.Light,
        };

        var now = DateTimeOffset.UtcNow;

        var events = Enumerable
            .Range(0, 5)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceId = device.Id,
                EventType = "DeviceStatus",
                Title = $"Evento {i}",
                Description = "Evento de teste.",
                Timestamp = now.AddMinutes(-i),
            })
            .ToList();

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(device);
        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/events?page=2&pageSize=2",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<ActivityLogEntryResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Page.Should().Be(2);
        pagedResult.PageSize.Should().Be(2);
        pagedResult.TotalCount.Should().Be(5);
        pagedResult.Items.Should().HaveCount(2);
        pagedResult.Items[0].Title.Should().Be("Evento 2");
        pagedResult.Items[1].Title.Should().Be("Evento 3");
    }

    [Fact]
    public async Task GetRoomActivityLog_WithNoEvents_ShouldReturnEmptyList()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var room = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Garagem",
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/events",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<ActivityLogEntryResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().BeEmpty();
        pagedResult.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task GetRoomActivityLog_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            ExternalAuthUid = "firebase-token-123",
        };

        var victim = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vítima",
            ExternalAuthUid = "token-vitima",
        };

        var victimRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = victim.Id,
            Name = "Cofre",
        };

        DbContext.Users.AddRange(loggedUser, victim);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{victimRoom.Id}/events",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
