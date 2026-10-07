using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Queries;

public class GetSceneStatsTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private async Task<User> SeedLoggedUserAsync(CancellationToken ct) =>
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);

    // Dia UTC "hoje - daysAgo" na hora indicada: determinístico dentro da janela de 7 dias.
    private static DateTimeOffset At(int daysAgo, int hourUtc, int minute = 0) =>
        new(
            DateTime.UtcNow.Date.AddDays(-daysAgo).AddHours(hourUtc).AddMinutes(minute),
            TimeSpan.Zero
        );

    private async Task<Scene> SeedSceneAsync(Guid userId, string name, CancellationToken ct)
    {
        var device = await ScenesTestData.SeedDeviceAsync(DbContext, userId, cancellationToken: ct);
        return await ScenesTestData.SeedSceneAsync(DbContext, userId, name, [(device, true)], ct);
    }

    private async Task SeedActivationAsync(
        Guid userId,
        Scene? scene,
        DateTimeOffset timestamp,
        EventSeverity severity = EventSeverity.Info,
        string? snapshotName = null,
        string eventType = SystemEventTypes.SceneActivated,
        string description = "ok",
        CancellationToken ct = default
    )
    {
        DbContext.SystemEvents.Add(
            new SystemEvent
            {
                UserId = userId,
                EventType = eventType,
                Title = $"Cena {snapshotName ?? scene?.Name} ativada",
                Description = description,
                Severity = severity,
                Source = EventSource.Scene,
                SceneId = scene?.Id,
                SceneName = snapshotName ?? scene?.Name,
                Timestamp = timestamp,
            }
        );
        await DbContext.SaveChangesAsync(ct);
    }

    private async Task<JsonElement> GetStatsAsync(string query, CancellationToken ct)
    {
        var response = await Client.GetAsync($"/api/scenes/stats{query}", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>(ct);
    }

    private static int[] PerDay(JsonElement body) =>
        body.GetProperty("activationsPerDay").EnumerateArray().Select(d => d.GetInt32()).ToArray();

    [Fact]
    public async Task GetSceneStats_WithoutActivations_ShouldReturnEmptyStatsNotMisleadingZeros()
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedLoggedUserAsync(ct);

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        PerDay(body).Should().Equal(0, 0, 0, 0, 0, 0, 0);
        body.GetProperty("activationsTotal").GetInt32().Should().Be(0);
        body.GetProperty("previousActivationsTotal").GetInt32().Should().Be(0);
        body.GetProperty("successRate").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("peakHour").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("lastProblem").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("topScenes").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GetSceneStats_ShouldCountPerDayOldestFirstAndKeepAnEmptyDayAsZero()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        // hoje -1 (2 ativações), hoje -3 (1), hoje -6 (1, o dia mais antigo da janela)
        await SeedActivationAsync(user.Id, scene, At(1, 10), ct: ct);
        await SeedActivationAsync(user.Id, scene, At(1, 15), ct: ct);
        await SeedActivationAsync(user.Id, scene, At(3, 9), ct: ct);
        await SeedActivationAsync(user.Id, scene, At(6, 8), ct: ct);

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        PerDay(body).Should().Equal(1, 0, 0, 1, 0, 2, 0);
        body.GetProperty("activationsTotal").GetInt32().Should().Be(4);
    }

    [Fact]
    public async Task GetSceneStats_ShouldCompareWithThePreviousSevenDaysAndIgnoreOlderEvents()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        await SeedActivationAsync(user.Id, scene, At(1, 10), ct: ct); // janela atual
        await SeedActivationAsync(user.Id, scene, At(7, 10), ct: ct); // semana anterior
        await SeedActivationAsync(user.Id, scene, At(12, 10), ct: ct); // semana anterior
        await SeedActivationAsync(user.Id, scene, At(20, 10), ct: ct); // fora das duas janelas

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        body.GetProperty("activationsTotal").GetInt32().Should().Be(1);
        body.GetProperty("previousActivationsTotal").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task GetSceneStats_ShouldCountOnlySceneActivationsOfTheLoggedUser()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var other = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        var otherScene = await SeedSceneAsync(other.Id, "Alheia", ct);
        await SeedActivationAsync(user.Id, scene, At(1, 10), ct: ct);
        await SeedActivationAsync(other.Id, otherScene, At(1, 10), ct: ct);
        await SeedActivationAsync(
            user.Id,
            scene,
            At(1, 11),
            eventType: SystemEventTypes.StateChange,
            ct: ct
        );

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        body.GetProperty("activationsTotal").GetInt32().Should().Be(1);
        body.GetProperty("topScenes").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetSceneStats_SuccessRate_ShouldCountOnlyActivationsWithoutWarning()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        for (var hour = 8; hour < 11; hour++)
            await SeedActivationAsync(user.Id, scene, At(1, hour), ct: ct);
        await SeedActivationAsync(
            user.Id,
            scene,
            At(1, 12),
            severity: EventSeverity.Warning,
            ct: ct
        );

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        body.GetProperty("successRate").GetDouble().Should().Be(75);
    }

    [Fact]
    public async Task GetSceneStats_TopScenes_ShouldRankByActivationsWithAtMostThree()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var a = await SeedSceneAsync(user.Id, "Alfa", ct);
        var b = await SeedSceneAsync(user.Id, "Beta", ct);
        var c = await SeedSceneAsync(user.Id, "Gama", ct);
        var d = await SeedSceneAsync(user.Id, "Delta", ct);
        foreach (var (scene, times) in new[] { (a, 1), (b, 4), (c, 3), (d, 2) })
            for (var i = 0; i < times; i++)
                await SeedActivationAsync(user.Id, scene, At(1, 8 + i), ct: ct);
        await SeedActivationAsync(user.Id, null, At(1, 20), ct: ct); // evento antigo, sem cena

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        var top = body.GetProperty("topScenes").EnumerateArray().ToList();
        top.Select(t => t.GetProperty("name").GetString()).Should().Equal("Beta", "Gama", "Delta");
        top.Select(t => t.GetProperty("activations").GetInt32()).Should().Equal(4, 3, 2);
        top[0].GetProperty("sceneId").GetGuid().Should().Be(b.Id);
        // o evento sem cena entra no total, só não entra no ranking
        body.GetProperty("activationsTotal").GetInt32().Should().Be(11);
    }

    [Fact]
    public async Task GetSceneStats_TopScenes_ShouldShowTheCurrentNameOrTheSnapshotWhenTheSceneIsGone()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var renamed = await SeedSceneAsync(user.Id, "Nome novo", ct);
        var removed = await SeedSceneAsync(user.Id, "Nome da época", ct);
        await SeedActivationAsync(user.Id, renamed, At(1, 8), snapshotName: "Nome velho", ct: ct);
        await SeedActivationAsync(user.Id, renamed, At(1, 9), snapshotName: "Nome velho", ct: ct);
        await SeedActivationAsync(user.Id, removed, At(1, 10), ct: ct);
        removed.IsDeleted = true;
        await DbContext.SaveChangesAsync(ct);

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        body.GetProperty("topScenes")
            .EnumerateArray()
            .Select(t => t.GetProperty("name").GetString())
            .Should()
            .Equal("Nome novo", "Nome da época");
    }

    [Fact]
    public async Task GetSceneStats_PeakHour_ShouldBeTheBusiestHourInTheUsersTimeZone()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        // 02:00 UTC é 23:00 do dia anterior em São Paulo (UTC-3, sem horário de verão).
        await SeedActivationAsync(user.Id, scene, At(2, 2, 10), ct: ct);
        await SeedActivationAsync(user.Id, scene, At(3, 2, 40), ct: ct);
        await SeedActivationAsync(user.Id, scene, At(4, 14), ct: ct);

        var utc = await GetStatsAsync("?timeZone=UTC", ct);
        var saoPaulo = await GetStatsAsync("?timeZone=America%2FSao_Paulo", ct);

        utc.GetProperty("peakHour").GetString().Should().Be("02:00");
        saoPaulo.GetProperty("peakHour").GetString().Should().Be("23:00");
    }

    [Fact]
    public async Task GetSceneStats_DayBoundary_ShouldFollowTheUsersTimeZone()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        // 02:00 UTC de "hoje UTC -2": em UTC é o dia -2 (índice 4); em São Paulo (UTC-3) é 23:00
        // do dia anterior. O "hoje" de cada fuso pode diferir conforme a hora em que o teste roda,
        // então o índice esperado em SP considera a diferença entre os dois "hoje".
        await SeedActivationAsync(user.Id, scene, At(2, 2), ct: ct);
        var saoPauloZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var saoPauloToday = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, saoPauloZone).Date;
        var expectedSaoPauloIndex = 3 + (DateTime.UtcNow.Date - saoPauloToday).Days;

        var utc = PerDay(await GetStatsAsync("?timeZone=UTC", ct));
        var saoPaulo = PerDay(await GetStatsAsync("?timeZone=America%2FSao_Paulo", ct));

        Array.IndexOf(utc, 1).Should().Be(4);
        Array.IndexOf(saoPaulo, 1).Should().Be(expectedSaoPauloIndex);
    }

    [Fact]
    public async Task GetSceneStats_LastProblem_ShouldBeTheMostRecentWarning()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        await SeedActivationAsync(
            user.Id,
            scene,
            At(5, 10),
            EventSeverity.Warning,
            description: "antigo",
            ct: ct
        );
        await SeedActivationAsync(
            user.Id,
            scene,
            At(2, 10),
            EventSeverity.Warning,
            description: "2 offline",
            ct: ct
        );
        await SeedActivationAsync(user.Id, scene, At(1, 10), ct: ct);

        var body = await GetStatsAsync("?timeZone=UTC", ct);

        var problem = body.GetProperty("lastProblem");
        problem.GetProperty("sceneName").GetString().Should().Be("Cinema");
        problem.GetProperty("description").GetString().Should().Be("2 offline");
        problem.GetProperty("timestamp").GetDateTimeOffset().Should().Be(At(2, 10));
    }

    [Fact]
    public async Task GetSceneStats_WithoutTimeZone_ShouldDefaultToUtc()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var scene = await SeedSceneAsync(user.Id, "Cinema", ct);
        await SeedActivationAsync(user.Id, scene, At(2, 2), ct: ct);

        var body = await GetStatsAsync("", ct);

        body.GetProperty("peakHour").GetString().Should().Be("02:00");
    }

    [Theory]
    [InlineData("Nao/Existe")]
    [InlineData("%20%20")]
    public async Task GetSceneStats_InvalidTimeZone_ShouldReturnBadRequest(string timeZone)
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedLoggedUserAsync(ct);

        var response = await Client.GetAsync($"/api/scenes/stats?timeZone={timeZone}", ct);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
