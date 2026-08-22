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

    [Fact]
    public void ParseStreamVolume_WithValidStreamMusicBlock_ShouldExtractCurrentAndMax()
    {
        const string output = """
            - STREAM_VOICE_CALL:
               Muted: false
               Min: 1
               Max: 5
               Current: 3 (speaker): 4
            - STREAM_MUSIC:
               Muted: false
               Min: 0
               Max: 25
               Current: 3 (speaker): 15, 4 (headset): 15
               Devices: speaker
            - STREAM_ALARM:
               Muted: false
               Min: 1
               Max: 7
            """;

        var (current, max) = GoogleTvNetworkService.ParseStreamVolume(output);

        current.Should().Be(15);
        max.Should().Be(25);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("no relevant stream here")]
    public void ParseStreamVolume_WhenOutputIsEmptyOrUnrecognized_ShouldReturnZeroZero(
        string? output
    )
    {
        var (current, max) = GoogleTvNetworkService.ParseStreamVolume(output);

        current.Should().Be(0);
        max.Should().Be(0);
    }

    [Fact]
    public void ParseMediaSession_WithActiveSessionPlaying_ShouldExtractTitleArtistAndPlayingState()
    {
        const string output = """
            Sessions Stack - have 1 sessions:
              Media session: package=com.google.android.youtube.tv
                state=PlaybackState {state=3, position=12345, speed=1.0}
                metadata: size=3, description=Some Great Video, Channel Name, null
            """;

        var info = GoogleTvNetworkService.ParseMediaSession(output);

        info.Should().NotBeNull();
        info!.Title.Should().Be("Some Great Video");
        info.Artist.Should().Be("Channel Name");
        info.IsPlaying.Should().BeTrue();
    }

    [Fact]
    public void ParseMediaSession_WithActiveSessionPaused_ShouldReturnIsPlayingFalse()
    {
        const string output = """
            Media session: package=com.spotify.tv.android
              state=PlaybackState {state=2, position=1000, speed=0.0}
              metadata: description=Some Song, Some Artist, null
            """;

        var info = GoogleTvNetworkService.ParseMediaSession(output);

        info.Should().NotBeNull();
        info!.IsPlaying.Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("no sessions here")]
    public void ParseMediaSession_WhenOutputHasNoSession_ShouldReturnNull(string? output)
    {
        GoogleTvNetworkService.ParseMediaSession(output).Should().BeNull();
    }

    [Fact]
    public void ParseMediaSession_WithNullDescriptionFields_ShouldReturnNull()
    {
        const string output = "metadata: description=null, null, null";

        GoogleTvNetworkService.ParseMediaSession(output).Should().BeNull();
    }
}
