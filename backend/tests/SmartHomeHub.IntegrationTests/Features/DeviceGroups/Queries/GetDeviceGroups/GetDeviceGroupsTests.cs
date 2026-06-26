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

        var groups = await response.Content.ReadFromJsonAsync<List<DeviceGroupResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        groups.Should().NotBeNull();
        groups.Should().HaveCount(1, "Apenas o grupo ativo do usuário logado deve ser retornado.");

        var group = groups.First();
        group.Id.Should().Be(myGroup1.Id);
        group.Name.Should().Be("Minha Casa");
        group.Devices.Should().HaveCount(1);
        group.Devices.First().Id.Should().Be(device1.Id);
    }
}
