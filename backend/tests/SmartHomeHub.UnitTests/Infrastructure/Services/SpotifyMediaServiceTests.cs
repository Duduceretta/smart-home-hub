using FluentAssertions;
using SmartHomeHub.Infrastructure.Services;

namespace SmartHomeHub.UnitTests.Infrastructure.Services;

public class SpotifyMediaServiceTests
{
    [Fact]
    public void ParsePlaybackResponse_WithFullTrackPlaying_ShouldMapAllFields()
    {
        const string json = """
            {
              "device": { "id": "abc", "is_active": true, "name": "My Laptop", "volume_percent": 55 },
              "is_playing": true,
              "item": {
                "name": "Song Title",
                "artists": [{ "name": "Artist A" }, { "name": "Artist B" }],
                "album": {
                  "images": [
                    { "url": "https://example.com/cover-640.jpg", "height": 640, "width": 640 },
                    { "url": "https://example.com/cover-300.jpg", "height": 300, "width": 300 }
                  ]
                }
              }
            }
            """;

        var result = SpotifyMediaService.ParsePlaybackResponse(json);

        result.Should().NotBeNull();
        result!.VolumePercent.Should().Be(55);
        result.IsPlaying.Should().BeTrue();
        result.Title.Should().Be("Song Title");
        result.Artist.Should().Be("Artist A, Artist B");
        result.AlbumCoverUrl.Should().Be("https://example.com/cover-640.jpg");
        result.DeviceName.Should().Be("My Laptop");
    }

    [Fact]
    public void ParsePlaybackResponse_WhenPaused_ShouldReturnIsPlayingFalse()
    {
        const string json = """
            {
              "device": { "name": "Phone", "volume_percent": 30 },
              "is_playing": false,
              "item": { "name": "Track", "artists": [{ "name": "Solo Artist" }], "album": { "images": [] } }
            }
            """;

        var result = SpotifyMediaService.ParsePlaybackResponse(json);

        result.Should().NotBeNull();
        result!.IsPlaying.Should().BeFalse();
        result.AlbumCoverUrl.Should().BeNull();
    }

    [Fact]
    public void ParsePlaybackResponse_WithoutItem_ShouldReturnNullTitleAndArtist()
    {
        const string json = """
            { "device": { "name": "Speaker", "volume_percent": 80 }, "is_playing": false }
            """;

        var result = SpotifyMediaService.ParsePlaybackResponse(json);

        result.Should().NotBeNull();
        result!.Title.Should().BeNull();
        result.Artist.Should().BeNull();
        result.VolumePercent.Should().Be(80);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ParsePlaybackResponse_WhenJsonIsEmpty_ShouldReturnNull(string? json)
    {
        SpotifyMediaService.ParsePlaybackResponse(json).Should().BeNull();
    }
}
