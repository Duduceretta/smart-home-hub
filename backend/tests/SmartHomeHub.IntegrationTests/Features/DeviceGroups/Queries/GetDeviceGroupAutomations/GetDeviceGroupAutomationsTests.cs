using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroupAutomations;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Queries.GetDeviceGroupAutomations;

public class GetDeviceGroupAutomationsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task GetDeviceGroupAutomations_ShouldReturnAutomationsReferencingGroupDevices()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luzes do Quarto",
        };

        var deviceInGroup = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Lâmpada Quarto",
            Brand = "Tuya",
            ExternalId = "AUTO-GRP-DEV-1",
            Type = DeviceType.Light,
        };

        var deviceOutside = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Lâmpada Cozinha",
            Brand = "Tuya",
            ExternalId = "AUTO-GRP-DEV-2",
            Type = DeviceType.Light,
        };

        group.Devices.Add(deviceInGroup);

        var matchingAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Ligar Luz ao Chegar",
            IsActive = true,
            RulePayload =
                $"{{\"actions\":[{{\"deviceId\":\"{deviceInGroup.Id}\",\"command\":\"turn-on\"}}]}}",
        };

        var nonMatchingAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Ligar Cozinha",
            IsActive = true,
            RulePayload =
                $"{{\"actions\":[{{\"deviceId\":\"{deviceOutside.Id}\",\"command\":\"turn-on\"}}]}}",
        };

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        DbContext.Devices.Add(deviceOutside);
        DbContext.Automations.AddRange(matchingAutomation, nonMatchingAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/device-groups/{group.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<List<DeviceGroupAutomationDto>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.Should().HaveCount(1);
        result[0].Id.Should().Be(matchingAutomation.Id);
        result[0].Name.Should().Be("Ligar Luz ao Chegar");
    }
}
