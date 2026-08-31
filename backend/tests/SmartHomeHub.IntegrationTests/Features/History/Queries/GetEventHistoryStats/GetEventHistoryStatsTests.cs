using System.Net;
using System.Net.Http.Json;
using System.Web;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.History.Queries.GetEventHistoryStats;

public class GetEventHistoryStatsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record EventHistoryStatsResponse(
        int TotalEvents,
        int AutomationCount,
        int AlertCount,
        int GroupActionCount
    );

    private static string BuildUrl(
        DateTimeOffset start,
        DateTimeOffset end,
        Guid? deviceId = null,
        Guid? roomId = null,
        Guid? deviceGroupId = null,
        EventSeverity? severity = null,
        EventSource? source = null,
        string? search = null
    )
    {
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["startDateUtc"] = start.ToString("O");
        query["endDateUtc"] = end.ToString("O");

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

        return $"/api/history/stats?{query}";
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
    public async Task GetEventHistoryStats_WithMoreEventsThanOnePage_ShouldCountAllMatchingEvents()
    {
        var user = await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        // 25 eventos (> tamanho de página default de 20) pra garantir que a
        // contagem não depende de paginação.
        var automationEvents = Enumerable
            .Range(0, 12)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "AutomationTriggered",
                Description = $"Automação {i}",
                Timestamp = now.AddMinutes(-i),
                Severity = EventSeverity.Info,
                Source = EventSource.Automation,
            })
            .ToList();

        var alertEvents = Enumerable
            .Range(0, 8)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "Alert",
                Description = $"Alerta {i}",
                Timestamp = now.AddMinutes(-i - 20),
                Severity = i % 2 == 0 ? EventSeverity.Warning : EventSeverity.Critical,
                Source = EventSource.System,
            })
            .ToList();

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luzes da Sala",
        };
        DbContext.DeviceGroups.Add(group);

        var groupEvents = Enumerable
            .Range(0, 5)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceGroupId = group.Id,
                EventType = "BulkAction",
                Description = $"Grupo {i}",
                Timestamp = now.AddMinutes(-i - 40),
                Severity = EventSeverity.Info,
                Source = EventSource.DeviceGroup,
            })
            .ToList();

        DbContext.SystemEvents.AddRange(automationEvents.Concat(alertEvents).Concat(groupEvents));
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            BuildUrl(now.AddDays(-1), now),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var stats = await response.Content.ReadFromJsonAsync<EventHistoryStatsResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        stats.Should().NotBeNull();
        stats!.TotalEvents.Should().Be(25);
        stats.AutomationCount.Should().Be(12);
        stats.AlertCount.Should().Be(8);
        stats.GroupActionCount.Should().Be(5);
    }

    [Fact]
    public async Task GetEventHistoryStats_OutOfDateRange_ShouldNotBeCounted()
    {
        var user = await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        DbContext.SystemEvents.Add(
            new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "AutomationTriggered",
                Description = "Fora do intervalo",
                Timestamp = now.AddDays(-10),
                Severity = EventSeverity.Info,
                Source = EventSource.Automation,
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            BuildUrl(now.AddDays(-1), now),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var stats = await response.Content.ReadFromJsonAsync<EventHistoryStatsResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        stats.Should().NotBeNull();
        stats!.TotalEvents.Should().Be(0);
        stats.AutomationCount.Should().Be(0);
    }

    [Fact]
    public async Task GetEventHistoryStats_EndDateBeforeStartDate_ShouldReturnBadRequest_NotThrow()
    {
        await SeedUserAsync();
        var now = DateTimeOffset.UtcNow;

        var response = await Client.GetAsync(
            BuildUrl(now, now.AddDays(-1)),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
