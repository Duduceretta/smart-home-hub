using FluentAssertions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SmartHomeHub.Application.Features.DeviceGroups.Commands.SetDeviceGroupBrightness;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Application.Features.DeviceGroups;

public class SetDeviceGroupBrightnessCommandHandlerTests
{
    private readonly AppDbContext _dbContext;
    private readonly ISender _sender = Substitute.For<ISender>();
    private readonly IServiceScopeFactory _scopeFactory;

    public SetDeviceGroupBrightnessCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new AppDbContext(options);

        // O handler cria um IServiceScope isolado por dispositivo (ver remarks do handler);
        // aqui simulamos isso com um provider mínimo cujo único serviço registrado é o
        // ISender mockado, sempre a mesma instância (singleton) entre todos os escopos.
        var services = new ServiceCollection();
        services.AddSingleton(_sender);
        _scopeFactory = services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
    }

    private async Task<(User user, DeviceGroup group)> SeedGroupWithLightsAsync(
        params (bool isOnline, bool isDeleted)[] lights
    )
    {
        var user = new User { Name = "Test User", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        var group = new DeviceGroup { UserId = user.Id, Name = "Sala" };

        foreach (var (isOnline, isDeleted) in lights)
        {
            group.Devices.Add(
                new Device
                {
                    UserId = user.Id,
                    Name = $"Luz {Guid.NewGuid()}",
                    Brand = "Tuya",
                    ExternalId = $"EXT-{Guid.NewGuid()}",
                    Type = DeviceType.Light,
                    IsDeleted = isDeleted,
                    LiveState = new DeviceLiveState { IsOnline = isOnline, IsOn = true },
                }
            );
        }

        _dbContext.Users.Add(user);
        _dbContext.DeviceGroups.Add(group);
        await _dbContext.SaveChangesAsync();

        return (user, group);
    }

    [Fact]
    public async Task Handle_WhenUserDoesNotExist_ShouldFail()
    {
        var handler = new SetDeviceGroupBrightnessCommandHandler(_dbContext, _scopeFactory);

        var result = await handler.Handle(
            new SetDeviceGroupBrightnessCommand(Guid.NewGuid(), "unknown-uid", 50),
            CancellationToken.None
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task Handle_WhenGroupDoesNotBelongToUser_ShouldFail()
    {
        var (user, group) = await SeedGroupWithLightsAsync((true, false));
        var otherUser = new User { Name = "Outro", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        _dbContext.Users.Add(otherUser);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var handler = new SetDeviceGroupBrightnessCommandHandler(_dbContext, _scopeFactory);

        var result = await handler.Handle(
            new SetDeviceGroupBrightnessCommand(group.Id, otherUser.ExternalAuthUid, 50),
            CancellationToken.None
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("DeviceGroup.NotFound");
    }

    [Fact]
    public async Task Handle_WhenNoEligibleLights_ShouldReturnZeroedResult()
    {
        var (user, group) = await SeedGroupWithLightsAsync((false, false), (true, true));
        var handler = new SetDeviceGroupBrightnessCommandHandler(_dbContext, _scopeFactory);

        var result = await handler.Handle(
            new SetDeviceGroupBrightnessCommand(group.Id, user.ExternalAuthUid, 50),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalCount.Should().Be(0);
        result.Value.SucceededCount.Should().Be(0);
        result.Value.FailedCount.Should().Be(0);
        await _sender
            .DidNotReceiveWithAnyArgs()
            .Send(Arg.Any<SetDeviceBrightnessCommand>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithMixedOutcomes_ShouldCountSucceededFailedAndTotalCorrectly()
    {
        var (user, group) = await SeedGroupWithLightsAsync(
            (true, false),
            (true, false),
            (true, false),
            (false, false), // offline, não elegível
            (true, true) // soft-deleted, não elegível
        );

        var eligibleIds = group
            .Devices.Where(d => !d.IsDeleted && d.LiveState!.IsOnline)
            .Select(d => d.Id)
            .ToList();

        _sender
            .Send(Arg.Any<SetDeviceBrightnessCommand>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var command = callInfo.Arg<SetDeviceBrightnessCommand>();
                var isFirstDevice = command.DeviceId == eligibleIds[0];
                return ValueTask.FromResult(
                    isFirstDevice
                        ? Result.Failure(new Error("Device.Offline", "Falhou"))
                        : Result.Success()
                );
            });

        var handler = new SetDeviceGroupBrightnessCommandHandler(_dbContext, _scopeFactory);

        var result = await handler.Handle(
            new SetDeviceGroupBrightnessCommand(group.Id, user.ExternalAuthUid, 75),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        result
            .Value.TotalCount.Should()
            .Be(3, "só as 3 luzes online e não deletadas são elegíveis");
        result.Value.SucceededCount.Should().Be(2);
        result.Value.FailedCount.Should().Be(1);

        await _sender
            .Received(3)
            .Send(Arg.Any<SetDeviceBrightnessCommand>(), Arg.Any<CancellationToken>());
    }
}
