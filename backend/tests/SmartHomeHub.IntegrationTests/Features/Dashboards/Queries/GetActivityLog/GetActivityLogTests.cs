using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Dashboards.Queries.GetActivityLog;

public class GetActivityLogTests(IntegrationTestWebAppFactory factory)
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

    public record PagedResponse<T>(
        List<T> Items,
        int Page,
        int PageSize,
        int TotalCount,
        int TotalPages,
        bool HasNextPage,
        bool HasPreviousPage
    );

    [Fact]
    public async Task GetActivityLog_ShouldReturnOnlyEvents_OwnedByTheLoggedUser_NewestFirst()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "vizinho-token",
        };

        var now = DateTimeOffset.UtcNow;

        var myOlderEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            EventType = "DeviceStatus",
            Title = "Lâmpada da Sala ligado",
            Description = "Ambiente: Sala de Estar",
            Timestamp = now.AddMinutes(-5),
        };
        var myNewerEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            EventType = "Spotify",
            Title = "Spotify reproduzindo",
            Description = "Monster — Imagine Dragons",
            Timestamp = now,
        };
        var otherUserEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            EventType = "DeviceStatus",
            Title = "Evento do vizinho",
            Description = "Não deve aparecer para o usuário logado.",
            Timestamp = now,
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.SystemEvents.AddRange(myOlderEvent, myNewerEvent, otherUserEvent);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/activity-log",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<ActivityLogEntryResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().HaveCount(2, "só os eventos do usuário logado.");

        pagedResult
            .Items.Select(entry => entry.Title)
            .Should()
            .ContainInOrder("Spotify reproduzindo", "Lâmpada da Sala ligado");

        pagedResult
            .Items.Should()
            .NotContain(entry => entry.Title == "Evento do vizinho");
    }

    [Fact]
    public async Task GetActivityLog_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var now = DateTimeOffset.UtcNow;

        var events = Enumerable
            .Range(0, 5)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                EventType = "System",
                Title = $"Evento {i}",
                Description = "Evento de teste.",
                Timestamp = now.AddMinutes(-i),
            })
            .ToList();

        DbContext.Users.Add(loggedUser);
        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/activity-log?page=2&pageSize=2",
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

        // Mais recente primeiro (Evento 0), então a página 2 (itens 3 e 4 da
        // ordenação) traz Evento 2 e Evento 3.
        pagedResult.Items.Should().HaveCount(2);
        pagedResult.Items[0].Title.Should().Be("Evento 2");
        pagedResult.Items[1].Title.Should().Be("Evento 3");
    }
}
