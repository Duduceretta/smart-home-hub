using FluentAssertions;
using SmartHomeHub.Infrastructure.Services;

namespace SmartHomeHub.UnitTests.Infrastructure.Services;

public class GoogleTvNetworkServiceTests
{
    [Theory]
    [InlineData("mWakefulness=Awake")]
    [InlineData("Display Power: state=ON")]
    [InlineData("mHoldingDisplaySuspendBlocker=true")]
    public void ParsePowerState_WhenOutputIndicatesScreenOn_ShouldReturnTrue(string line)
    {
        var output = $"  Power Manager State:\n    {line}\n    other=stuff";

        GoogleTvNetworkService.ParsePowerState(output).Should().BeTrue();
    }

    [Theory]
    [InlineData("mWakefulness=Asleep")]
    [InlineData("Display Power: state=OFF")]
    [InlineData("mHoldingDisplaySuspendBlocker=false")]
    public void ParsePowerState_WhenOutputIndicatesScreenOff_ShouldReturnFalse(string line)
    {
        var output = $"  Power Manager State:\n    {line}\n    other=stuff";

        GoogleTvNetworkService.ParsePowerState(output).Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("garbage output without any known marker")]
    public void ParsePowerState_WhenOutputIsEmptyOrUnrecognized_ShouldReturnFalse(string? output)
    {
        GoogleTvNetworkService.ParsePowerState(output).Should().BeFalse();
    }
}
