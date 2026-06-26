using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.DeleteDeviceGroup;

public class DeleteDeviceGroupTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteDeviceGroup_ShouldSoftDelete_AndUnlinkDevicesWithoutDestroyingThem()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            Name = "Luz Intocável",
            Brand = "Tuya",
            ExternalId = "MAC-DELETE-SAFE",
            Type = DeviceType.Light,
        };

        var groupId = Guid.NewGuid();
        var group = new DeviceGroup
        {
            Id = groupId,
            UserId = userId,
            Name = "Grupo Temporário",
            Devices = [device],
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/device-groups/{groupId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();

        var physicalGroup = await DbContext
            .Set<DeviceGroup>()
            .IgnoreQueryFilters()
            .Include(group => group.Devices)
            .FirstOrDefaultAsync(
                group => group.Id == groupId,
                TestContext.Current.CancellationToken
            );

        physicalGroup.Should().NotBeNull("O registro não deve ser apagado fisicamente.");
        physicalGroup.IsDeleted.Should().BeTrue("A flag de exclusão lógica deve estar ativada.");
        physicalGroup
            .Devices.Should()
            .BeEmpty("A tabela intermediária deve ter sido limpa pelo Clear().");

        var physicalDevice = await DbContext.Devices.FirstOrDefaultAsync(
            device => device.Id == deviceId,
            TestContext.Current.CancellationToken
        );

        physicalDevice
            .Should()
            .NotBeNull("A exclusão do grupo não pode deletar os dispositivos associados!");
        physicalDevice
            .IsDeleted.Should()
            .BeFalse("O dispositivo deve continuar ativo e funcional.");
    }

    [Fact]
    public async Task DeleteDeviceGroup_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Hacker",
            ExternalAuthUid = "firebase-token-123",
        };
        var victimUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vítima",
            ExternalAuthUid = "token-vitima",
        };

        var victimGroupId = Guid.NewGuid();
        var victimGroup = new DeviceGroup
        {
            Id = victimGroupId,
            UserId = victimUser.Id,
            Name = "Grupo Privado",
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.DeviceGroups.Add(victimGroup);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/device-groups/{victimGroupId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalGroup = await DbContext
            .Set<DeviceGroup>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                group => group.Id == victimGroupId,
                TestContext.Current.CancellationToken
            );

        physicalGroup!.IsDeleted.Should().BeFalse("O grupo de terceiros não pode ser alterado.");
    }
}
