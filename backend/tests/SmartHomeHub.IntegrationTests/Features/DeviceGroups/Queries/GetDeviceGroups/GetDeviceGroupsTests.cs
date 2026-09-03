using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Queries.GetDeviceGroups;

public class GetDeviceGroupsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record DeviceInGroupResponse(
        Guid Id,
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        bool IsOn,
        bool IsOnline,
        int? Brightness
    );

    private record DeviceGroupResponse(
        Guid Id,
        string Name,
        string? Icon,
        List<DeviceInGroupResponse> Devices,
        int? AverageBrightness
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
    public async Task GetDeviceGroups_ShouldReturnOnlyActiveGroups_OwnedByTheLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };
        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "token-vizinho",
        };

        var device1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz 1",
            Brand = "A",
            ExternalId = "M1",
            Type = DeviceType.Light,
        };

        var myGroup1 = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Minha Casa",
            Devices = [device1],
        };
        var myDeletedGroup = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Grupo Deletado",
            IsDeleted = true,
        };
        var otherUserGroup = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            Name = "Casa do Vizinho",
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Devices.Add(device1);
        DbContext.DeviceGroups.AddRange(myGroup1, myDeletedGroup, otherUserGroup);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();

        pagedResult!
            .Items.Should()
            .HaveCount(1, "Apenas o grupo ativo do usuário logado deve ser retornado.");

        var group = pagedResult.Items.First();
        group.Id.Should().Be(myGroup1.Id);
        group.Name.Should().Be("Minha Casa");
        group.Devices.Should().HaveCount(1);
        group.Devices.First().Id.Should().Be(device1.Id);
    }

    [Fact]
    public async Task GetDeviceGroups_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var groups = new List<DeviceGroup>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "A_Grupo",
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "B_Grupo",
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "C_Grupo",
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "D_Grupo",
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "E_Grupo",
            },
        };

        DbContext.Users.Add(loggedUser);
        DbContext.DeviceGroups.AddRange(groups);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups?page=2&pageSize=2",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();

        pagedResult.Page.Should().Be(2);
        pagedResult.PageSize.Should().Be(2);
        pagedResult.TotalCount.Should().Be(5);
        pagedResult.TotalPages.Should().Be(3);
        pagedResult.HasPreviousPage.Should().BeTrue();
        pagedResult.HasNextPage.Should().BeTrue();

        pagedResult.Items.Should().HaveCount(2);
        pagedResult.Items[0].Name.Should().Be("C_Grupo");
        pagedResult.Items[1].Name.Should().Be("D_Grupo");
    }

    [Fact]
    public async Task GetDeviceGroups_MultipleOnlineLightsWithBrightness_ShouldReturnRoundedAverage()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var light1 = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz 1",
            Brand = "A",
            ExternalId = "M1",
            Type = DeviceType.Light,
            IsOnline = true,
            Brightness = 40,
        };
        var light2 = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz 2",
            Brand = "A",
            ExternalId = "M2",
            Type = DeviceType.Light,
            IsOnline = true,
            Brightness = 81,
        };

        var group = new DeviceGroup
        {
            UserId = loggedUser.Id,
            Name = "Sala",
            Devices = [light1, light2],
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.AddRange(light1, light2);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups",
            TestContext.Current.CancellationToken
        );
        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        // (40 + 81) / 2 = 60.5 -> arredonda pra 60 (banker's rounding do Math.Round)
        pagedResult!.Items.Single().AverageBrightness.Should().Be(60);
    }

    [Fact]
    public async Task GetDeviceGroups_LightOfflineOrWithoutBrightness_ShouldBeExcludedFromAverage()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var onlineLightWithBrightness = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz Online",
            Brand = "A",
            ExternalId = "M1",
            Type = DeviceType.Light,
            IsOnline = true,
            Brightness = 50,
        };
        var offlineLightWithBrightness = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz Offline",
            Brand = "A",
            ExternalId = "M2",
            Type = DeviceType.Light,
            IsOnline = false,
            Brightness = 90,
        };
        var onlineLightWithoutBrightness = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz Sem Brilho Ajustado",
            Brand = "A",
            ExternalId = "M3",
            Type = DeviceType.Light,
            IsOnline = true,
            Brightness = null,
        };
        var onlineSwitchWithBrightness = new Device
        {
            UserId = loggedUser.Id,
            Name = "Tomada (não é luz)",
            Brand = "A",
            ExternalId = "M4",
            Type = DeviceType.Switch,
            IsOnline = true,
            Brightness = 100,
        };

        var group = new DeviceGroup
        {
            UserId = loggedUser.Id,
            Name = "Sala",
            Devices =
            [
                onlineLightWithBrightness,
                offlineLightWithBrightness,
                onlineLightWithoutBrightness,
                onlineSwitchWithBrightness,
            ],
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.AddRange(
            onlineLightWithBrightness,
            offlineLightWithBrightness,
            onlineLightWithoutBrightness,
            onlineSwitchWithBrightness
        );
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups",
            TestContext.Current.CancellationToken
        );
        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        // Só a "Luz Online" (50) conta — offline, sem brilho, e não-luz ficam de fora.
        pagedResult!.Items.Single().AverageBrightness.Should().Be(50);
    }

    [Fact]
    public async Task GetDeviceGroups_NoLightMeetsBothCriteria_ShouldReturnNullAverageBrightness()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var offlineLight = new Device
        {
            UserId = loggedUser.Id,
            Name = "Luz Offline",
            Brand = "A",
            ExternalId = "M1",
            Type = DeviceType.Light,
            IsOnline = false,
            Brightness = 70,
        };
        var group = new DeviceGroup
        {
            UserId = loggedUser.Id,
            Name = "Sala",
            Devices = [offlineLight],
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.Add(offlineLight);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups",
            TestContext.Current.CancellationToken
        );
        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult!.Items.Single().AverageBrightness.Should().BeNull();
    }

    [Fact]
    public async Task GetDeviceGroups_GroupWithNoDevicesAtAll_ShouldReturnNullAverageBrightnessWithoutBreaking()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };
        var emptyGroup = new DeviceGroup { UserId = loggedUser.Id, Name = "Grupo Vazio" };

        DbContext.Users.Add(loggedUser);
        DbContext.DeviceGroups.Add(emptyGroup);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/device-groups",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<DeviceGroupResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult!.Items.Single().AverageBrightness.Should().BeNull();
    }
}
