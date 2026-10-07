using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Queries;

public class GetScenesSearchTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private async Task<User> SeedLoggedUserAsync(CancellationToken ct) =>
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);

    private async Task<Room> SeedRoomAsync(Guid userId, string name, CancellationToken ct)
    {
        var room = new Room { UserId = userId, Name = name };
        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(ct);
        return room;
    }

    private async Task<Device> SeedDeviceInRoomAsync(
        Guid userId,
        string name,
        Room? room,
        CancellationToken ct
    )
    {
        var device = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            userId,
            DeviceType.Light,
            name,
            ct
        );
        device.RoomId = room?.Id;
        await DbContext.SaveChangesAsync(ct);
        return device;
    }

    private async Task<JsonElement> GetJsonAsync(string url, CancellationToken ct)
    {
        var response = await Client.GetAsync(url, ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>(ct);
    }

    private static List<string?> Names(JsonElement body) =>
        body.GetProperty("items")
            .EnumerateArray()
            .Select(item => item.GetProperty("name").GetString())
            .ToList();

    [Fact]
    public async Task GetScenes_SearchByName_ShouldIgnoreCaseAndAccents()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var lamp = await SeedDeviceInRoomAsync(user.Id, "Lâmpada", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Relaxação", [(lamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Cinema", [(lamp, true)], ct);

        var body = await GetJsonAsync("/api/scenes?search=RELAXACAO", ct);

        Names(body).Should().Equal("Relaxação");
        body.GetProperty("totalCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task GetScenes_SearchByDeviceName_ShouldMatchScenesThatContainTheDevice()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var sofaLamp = await SeedDeviceInRoomAsync(user.Id, "Luminária do Sofá", null, ct);
        var fan = await SeedDeviceInRoomAsync(user.Id, "Ventilador", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Leitura", [(sofaLamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Verão", [(fan, true)], ct);

        var body = await GetJsonAsync("/api/scenes?search=luminaria", ct);

        Names(body).Should().Equal("Leitura");
    }

    [Fact]
    public async Task GetScenes_SearchWithLikeWildcards_ShouldTreatThemAsLiteralText()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var lamp = await SeedDeviceInRoomAsync(user.Id, "Lâmpada", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Foco 100%", [(lamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Foco total", [(lamp, true)], ct);

        var percent = await GetJsonAsync("/api/scenes?search=%25", ct);
        var underscore = await GetJsonAsync("/api/scenes?search=_", ct);

        Names(percent).Should().Equal("Foco 100%");
        Names(underscore).Should().BeEmpty();
    }

    [Fact]
    public async Task GetScenes_BlankSearch_ShouldReturnEverything()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var lamp = await SeedDeviceInRoomAsync(user.Id, "Lâmpada", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "A", [(lamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "B", [(lamp, true)], ct);

        var body = await GetJsonAsync("/api/scenes?search=%20%20", ct);

        body.GetProperty("totalCount").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task GetScenes_FilterByRoom_ShouldKeepScenesWithADeviceInThatRoom()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var living = await SeedRoomAsync(user.Id, "Sala", ct);
        var bedroom = await SeedRoomAsync(user.Id, "Quarto", ct);
        var livingLamp = await SeedDeviceInRoomAsync(user.Id, "Luz da sala", living, ct);
        var bedLamp = await SeedDeviceInRoomAsync(user.Id, "Luz do quarto", bedroom, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Filme", [(livingLamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Dormir", [(bedLamp, false)], ct);
        await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Casa toda",
            [(livingLamp, true), (bedLamp, true)],
            ct
        );

        var body = await GetJsonAsync("/api/scenes?room=Sala", ct);

        Names(body).Should().Equal("Casa toda", "Filme");
    }

    [Fact]
    public async Task GetScenes_FilterByNoRoom_ShouldMatchDevicesWithoutRoom()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var living = await SeedRoomAsync(user.Id, "Sala", ct);
        var livingLamp = await SeedDeviceInRoomAsync(user.Id, "Luz da sala", living, ct);
        var loose = await SeedDeviceInRoomAsync(user.Id, "Tomada solta", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Filme", [(livingLamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Sem lugar", [(loose, true)], ct);

        var body = await GetJsonAsync("/api/scenes?room=" + Uri.EscapeDataString("Sem cômodo"), ct);

        Names(body).Should().Equal("Sem lugar");
    }

    [Fact]
    public async Task GetScenes_SearchAndRoomTogether_ShouldPageOverTheFilteredSet()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var living = await SeedRoomAsync(user.Id, "Sala", ct);
        var livingLamp = await SeedDeviceInRoomAsync(user.Id, "Luz da sala", living, ct);
        var other = await SeedDeviceInRoomAsync(user.Id, "Solta", null, ct);
        foreach (var name in new[] { "Filme A", "Filme B", "Filme C" })
            await ScenesTestData.SeedSceneAsync(DbContext, user.Id, name, [(livingLamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Filme D", [(other, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Jantar", [(livingLamp, true)], ct);

        var body = await GetJsonAsync("/api/scenes?search=filme&room=Sala&page=2&pageSize=2", ct);

        Names(body).Should().Equal("Filme C");
        body.GetProperty("totalCount").GetInt32().Should().Be(3);
        body.GetProperty("totalPages").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task GetScenes_Search_ShouldNeverLeakScenesOfAnotherUser()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var other = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var lamp = await SeedDeviceInRoomAsync(user.Id, "Lâmpada", null, ct);
        var otherLamp = await SeedDeviceInRoomAsync(other.Id, "Lâmpada", null, ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Minha cena", [(lamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(
            DbContext,
            other.Id,
            "Cena alheia",
            [(otherLamp, true)],
            ct
        );

        var body = await GetJsonAsync("/api/scenes?search=cena", ct);

        Names(body).Should().Equal("Minha cena");
    }

    [Fact]
    public async Task GetSceneRooms_ShouldListDistinctRoomsOfOwnActiveScenesSorted()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var other = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var living = await SeedRoomAsync(user.Id, "Sala", ct);
        var bedroom = await SeedRoomAsync(user.Id, "Quarto", ct);
        var unusedRoom = await SeedRoomAsync(user.Id, "Garagem", ct);
        var otherRoom = await SeedRoomAsync(other.Id, "Varanda", ct);
        var livingLamp = await SeedDeviceInRoomAsync(user.Id, "Sala 1", living, ct);
        var livingLamp2 = await SeedDeviceInRoomAsync(user.Id, "Sala 2", living, ct);
        var bedLamp = await SeedDeviceInRoomAsync(user.Id, "Quarto 1", bedroom, ct);
        var loose = await SeedDeviceInRoomAsync(user.Id, "Solta", null, ct);
        var inUnused = await SeedDeviceInRoomAsync(user.Id, "Garagem 1", unusedRoom, ct);
        var otherLamp = await SeedDeviceInRoomAsync(other.Id, "Varanda 1", otherRoom, ct);
        await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Tudo",
            [(livingLamp, true), (livingLamp2, true), (bedLamp, true), (loose, true)],
            ct
        );
        var deleted = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Apagada",
            [(inUnused, true)],
            ct
        );
        deleted.IsDeleted = true;
        await ScenesTestData.SeedSceneAsync(DbContext, other.Id, "Alheia", [(otherLamp, true)], ct);
        await DbContext.SaveChangesAsync(ct);

        var body = await GetJsonAsync("/api/scenes/rooms", ct);

        body.EnumerateArray()
            .Select(room => room.GetString())
            .Should()
            .Equal("Quarto", "Sala", "Sem cômodo");
    }

    [Fact]
    public async Task GetScenes_SearchLongerThanTheLimit_ShouldBeCutInsteadOfRejected()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await SeedLoggedUserAsync(ct);
        var lamp = await SeedDeviceInRoomAsync(user.Id, "Lâmpada", null, ct);
        await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            new string('a', 100),
            [(lamp, true)],
            ct
        );

        // 100 "a" casam a cena; o 101º caractere ("b") seria cortado e não impede o resultado.
        var body = await GetJsonAsync($"/api/scenes?search={new string('a', 100)}b", ct);

        body.GetProperty("totalCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task GetSceneRooms_WithoutScenes_ShouldReturnEmptyList()
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedLoggedUserAsync(ct);

        var body = await GetJsonAsync("/api/scenes/rooms", ct);

        body.GetArrayLength().Should().Be(0);
    }
}
