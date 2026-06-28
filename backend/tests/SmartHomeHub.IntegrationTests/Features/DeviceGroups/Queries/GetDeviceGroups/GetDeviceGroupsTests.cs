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
        bool IsOn
    );

    private record DeviceGroupResponse(
        Guid Id,
        string Name,
        string? Icon,
        List<DeviceInGroupResponse> Devices
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
}
