using FluentAssertions;
using SmartHomeHub.Application.Common.Telemetry;

namespace SmartHomeHub.UnitTests.Application.Common.Telemetry;

public class TelemetryBucketingTests
{
    [Theory]
    [InlineData(8, 0, 8, 0)]
    [InlineData(8, 5, 8, 5)]
    [InlineData(8, 7, 8, 5)]
    [InlineData(8, 9, 8, 5)]
    [InlineData(8, 59, 8, 55)]
    public void FloorToBucket_WithFiveMinuteBuckets_ShouldFloorToNearestBucketStart(
        int hour,
        int minute,
        int expectedHour,
        int expectedMinute
    )
    {
        var timestamp = new DateTimeOffset(2026, 3, 10, hour, minute, 42, TimeSpan.Zero);

        var bucket = TelemetryBucketing.FloorToBucket(timestamp);

        bucket
            .Should()
            .Be(new DateTimeOffset(2026, 3, 10, expectedHour, expectedMinute, 0, TimeSpan.Zero));
    }

    [Fact]
    public void FloorToBucket_ShouldAlwaysReturnZeroSecondsAndZeroOffset()
    {
        var timestamp = new DateTimeOffset(2026, 3, 10, 8, 7, 33, TimeSpan.FromHours(-3));

        var bucket = TelemetryBucketing.FloorToBucket(timestamp);

        bucket.Second.Should().Be(0);
        bucket.Offset.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void BuildDeviceBucketAverages_WithTwoReadingsInSameBucket_ShouldAverageNotSum()
    {
        var deviceId = Guid.NewGuid();
        var bucketStart = new DateTimeOffset(2026, 3, 10, 8, 5, 0, TimeSpan.Zero);

        var logs = new[]
        {
            (Timestamp: bucketStart, deviceId, PowerUsageWatts: (double?)400, IsEstimated: false),
            (
                Timestamp: bucketStart.AddMinutes(2),
                deviceId,
                PowerUsageWatts: (double?)600,
                IsEstimated: false
            ),
        };

        var result = TelemetryBucketing.BuildDeviceBucketAverages(logs);

        result.Should().ContainSingle();
        result[0].AverageWatts.Should().Be(500, "média de 400W e 600W, não a soma (1000W).");
    }

    [Fact]
    public void BuildDeviceBucketAverages_ShouldGroupSeparatelyPerDevice_EvenInTheSameBucket()
    {
        var bucketStart = new DateTimeOffset(2026, 3, 10, 8, 5, 0, TimeSpan.Zero);
        var deviceA = Guid.NewGuid();
        var deviceB = Guid.NewGuid();

        var logs = new[]
        {
            (
                Timestamp: bucketStart,
                DeviceId: deviceA,
                PowerUsageWatts: (double?)500,
                IsEstimated: false
            ),
            (
                Timestamp: bucketStart,
                DeviceId: deviceB,
                PowerUsageWatts: (double?)300,
                IsEstimated: false
            ),
        };

        var result = TelemetryBucketing.BuildDeviceBucketAverages(logs);

        result
            .Should()
            .HaveCount(2, "cada dispositivo forma seu próprio grupo, mesmo no mesmo balde.");
        result.Should().ContainSingle(x => x.DeviceId == deviceA && x.AverageWatts == 500);
        result.Should().ContainSingle(x => x.DeviceId == deviceB && x.AverageWatts == 300);
    }

    [Fact]
    public void BuildDeviceBucketAverages_ShouldIgnoreLogsWithoutPowerUsage()
    {
        var deviceId = Guid.NewGuid();
        var logs = new[]
        {
            (
                Timestamp: DateTimeOffset.UtcNow,
                deviceId,
                PowerUsageWatts: (double?)null,
                IsEstimated: false
            ),
        };

        var result = TelemetryBucketing.BuildDeviceBucketAverages(logs);

        result
            .Should()
            .BeEmpty("logs só de temperatura (sem PowerUsageWatts) não geram balde de energia.");
    }

    [Fact]
    public void BuildDeviceBucketAverages_WhenAnyReadingInBucketIsEstimated_ShouldMarkBucketAsEstimated()
    {
        var deviceId = Guid.NewGuid();
        var bucketStart = new DateTimeOffset(2026, 3, 10, 8, 5, 0, TimeSpan.Zero);

        var logs = new[]
        {
            (Timestamp: bucketStart, deviceId, PowerUsageWatts: (double?)400, IsEstimated: false),
            (
                Timestamp: bucketStart.AddMinutes(1),
                deviceId,
                PowerUsageWatts: (double?)600,
                IsEstimated: true
            ),
        };

        var result = TelemetryBucketing.BuildDeviceBucketAverages(logs);

        result.Should().ContainSingle();
        result[0].IsEstimated.Should().BeTrue();
    }
}
