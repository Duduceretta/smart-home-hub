using System.Net;
using System.Net.Http.Json;
using System.Web;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.History.Queries.GetEventHistory;

public class GetEventHistoryTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record EventHistoryEntryResponse(
        Guid Id,
        DateTimeOffset TimestampUtc,
        string EventType,
        string Description,
        Guid? DeviceId,
        string? DeviceName,
        Guid? RoomId,
        string? RoomName,
        Guid? DeviceGroupId,
        string? DeviceGroupName,
        string Source,
        string Severity,
        string? OldValue,
        string? NewValue
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

    private static string BuildUrl(
        DateTimeOffset start,
        DateTimeOffset end,
        Guid? deviceId = null,
        Guid? roomId = null,
        Guid? deviceGroupId = null,
        EventSeverity? severity = null,
        EventSource? source = null,
        string? search = null,
        int page = 1,
        int pageSize = 10
    )
    {
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["startDateUtc"] = start.ToString("O");
        query["endDateUtc"] = end.ToString("O");
        query["page"] = page.ToString();
        query["pageSize"] = pageSize.ToString();

        if (deviceId != null)
            query["deviceId"] = deviceId.ToString();

        if (roomId != null)
            query["roomId"] = roomId.ToString();

        if (deviceGroupId != null)
            query["deviceGroupId"] = deviceGroupId.ToString();

        if (severity != null)
            query["severity"] = severity.ToString();

        if (source != null)
            query["source"] = source.ToString();

        if (!string.IsNullOrEmpty(search))
            query["search"] = search;

        return $"/api/history?{query}";
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return user;
    }

    [Fact]
    public async Task GetEventHistory_WithinDateRange_ShouldReturnEventsOrderedByTimestampDesc()
    {
        var user = await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        var older = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EventType = "StateChange",
            Description = "Lâmpada ligada",
            Timestamp = now.AddMinutes(-10),
            Severity = EventSeverity.Info,
            Source = EventSource.UserManual,
        };
        var newer = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EventType = "StateChange",
            Description = "Lâmpada desligada",
            Timestamp = now.AddMinutes(-1),
            Severity = EventSeverity.Info,
            Source = EventSource.UserManual,
        };
        var outOfRange = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EventType = "StateChange",
            Description = "Evento antigo, fora do intervalo",
            Timestamp = now.AddDays(-10),
            Severity = EventSeverity.Info,
            Source = EventSource.UserManual,
        };

        DbContext.SystemEvents.AddRange(older, newer, outOfRange);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            BuildUrl(now.AddDays(-1), now),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResponse<EventHistoryEntryResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        paged.Should().NotBeNull();
        paged!.Items.Should().HaveCount(2);
        paged
            .Items.Select(item => item.Description)
            .Should()
            .ContainInOrder("Lâmpada desligada", "Lâmpada ligada");
    }

    [Fact]
    public async Task GetEventHistory_WithDeviceGroupFilter_ShouldReturnOnlyGroupEvents()
    {
        var user = await SeedUserAsync();
        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luzes do Jardim",
        };
        DbContext.DeviceGroups.Add(group);

        var now = DateTimeOffset.UtcNow;

        var groupEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceGroupId = group.Id,
            DeviceGroupName = group.Name,
            EventType = "BulkAction",
            Description = "Grupo Luzes do Jardim desligado",
            Timestamp = now.AddMinutes(-1),
            Severity = EventSeverity.Info,
            Source = EventSource.DeviceGroup,
        };

        var otherEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EventType = "StateChange",
            Description = "Evento avulso",
            Timestamp = now.AddMinutes(-2),
            Severity = EventSeverity.Info,
            Source = EventSource.UserManual,
        };

        DbContext.SystemEvents.AddRange(groupEvent, otherEvent);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            BuildUrl(now.AddDays(-1), now, deviceGroupId: group.Id),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResponse<EventHistoryEntryResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        paged!.Items.Should().ContainSingle();
        paged.Items[0].DeviceGroupId.Should().Be(group.Id);
        paged.Items[0].DeviceGroupName.Should().Be("Luzes do Jardim");
        paged.Items[0].Source.Should().Be("DeviceGroup");
    }

    [Fact]
    public async Task GetEventHistory_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var user = await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        var events = Enumerable
            .Range(0, 5)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "StateChange",
                Description = $"Evento {i}",
                Timestamp = now.AddMinutes(-i),
                Severity = EventSeverity.Info,
                Source = EventSource.System,
            })
            .ToList();

        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            BuildUrl(now.AddDays(-1), now, page: 2, pageSize: 2),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResponse<EventHistoryEntryResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        paged.Should().NotBeNull();
        paged!.Page.Should().Be(2);
        paged.PageSize.Should().Be(2);
        paged.TotalCount.Should().Be(5);
        paged.Items.Should().HaveCount(2);
        paged.Items[0].Description.Should().Be("Evento 2");
        paged.Items[1].Description.Should().Be("Evento 3");
    }

    [Fact]
    public async Task GetEventHistory_EndDateBeforeStartDate_ShouldReturnBadRequest_NotThrow()
    {
        await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        var response = await Client.GetAsync(
            BuildUrl(now, now.AddDays(-1)),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetEventHistory_WithSearchFilter_ShouldReturnOnlyMatchingEvents()
    {
        var user = await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        DbContext.SystemEvents.AddRange(
            new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "DeviceStateChanged",
                Description = "Lâmpada ligada via automação",
                DeviceName = "Lâmpada Sala",
                Timestamp = now.AddMinutes(-5),
                Source = EventSource.Automation,
                Severity = EventSeverity.Info,
            },
            new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "NetworkTimeout",
                Description = "Falha de conexão",
                DeviceName = "Smart-TV",
                Timestamp = now.AddMinutes(-2),
                Source = EventSource.System,
                Severity = EventSeverity.Warning,
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var url = BuildUrl(now.AddDays(-1), now.AddDays(1), search: "Lâmpada");
        var response = await Client.GetAsync(url, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse<EventHistoryEntryResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        paged.Should().NotBeNull();
        paged!.TotalCount.Should().Be(1);
        paged.Items.Should().ContainSingle();
        paged.Items[0].Description.Should().Be("Lâmpada ligada via automação");
    }
}
