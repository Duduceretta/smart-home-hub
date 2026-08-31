using FluentAssertions;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

public class TuyaColorConverterTests
{
    [Theory]
    [InlineData(0, 10)]
    [InlineData(100, 1000)]
    [InlineData(50, 505)]
    public void PercentToDeviceBrightness_ValidPercent_ShouldMapToConfirmedDeviceRange(
        int percent,
        int expectedDeviceValue
    )
    {
        // Act
        var result = TuyaColorConverter.PercentToDeviceBrightness(percent);

        // Assert
        result.Should().Be(expectedDeviceValue);
    }

    [Theory]
    [InlineData(-10, 10)]
    [InlineData(150, 1000)]
    public void PercentToDeviceBrightness_OutOfRangePercent_ShouldClamp(int percent, int expectedDeviceValue)
    {
        // Act
        var result = TuyaColorConverter.PercentToDeviceBrightness(percent);

        // Assert
        result.Should().Be(expectedDeviceValue);
    }

    [Fact]
    public void HexColorToDpValue_PureRed_ShouldMatchRealCapturedHueNearZero()
    {
        // Arrange — o próprio dispositivo real (diagnóstico manual via
        // /api/dev/tuya-query-status) retornou "016203e803e8" (H=354°) ao
        // trocar pra vermelho pelo app Smart Life — bem próximo do 0°/360°
        // teórico do vermelho puro, dentro da margem de erro humana/hardware.

        // Act
        var result = TuyaColorConverter.HexColorToDpValue("#FF0000");

        // Assert — vermelho puro (#FF0000) é H=0, S=1000, V=1000.
        result.Should().Be("000003e803e8");
    }

    [Fact]
    public void HexColorToDpValue_PureBlue_ShouldReturnHue240FullSaturationAndValue()
    {
        // Act
        var result = TuyaColorConverter.HexColorToDpValue("#0000FF");

        // Assert — azul puro é H=240 (0xf0), S=1000, V=1000.
        result.Should().Be("00f003e803e8");
    }

    [Fact]
    public void HexColorToDpValue_White_ShouldReturnZeroSaturation()
    {
        // Act
        var result = TuyaColorConverter.HexColorToDpValue("#FFFFFF");

        // Assert — branco puro: sem saturação, valor máximo.
        result.Should().Be("0000000003e8");
    }

    [Theory]
    [InlineData("FF0000")]
    [InlineData("#FF00")]
    [InlineData("#GGGGGG")]
    [InlineData("")]
    public void HexColorToDpValue_InvalidFormat_ShouldThrow(string invalidHex)
    {
        // Act
        var act = () => TuyaColorConverter.HexColorToDpValue(invalidHex);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(100, 1000)]
    [InlineData(83, 830)]
    public void PercentToDeviceColorTemp_ValidPercent_ShouldMapToConfirmedDeviceRange(
        int percent,
        int expectedDeviceValue
    )
    {
        // Act
        var result = TuyaColorConverter.PercentToDeviceColorTemp(percent);

        // Assert
        result.Should().Be(expectedDeviceValue);
    }

    [Theory]
    [InlineData("00b403e803e8", true)]
    [InlineData("016203e803e8", true)]
    [InlineData("white", false)]
    [InlineData(520.0, false)]
    [InlineData(null, false)]
    public void LooksLikeColorDpValue_VariousDpValues_ShouldDetectOnlyTwelveHexCharStrings(
        object? value,
        bool expected
    )
    {
        // Act
        var result = TuyaColorConverter.LooksLikeColorDpValue(value);

        // Assert
        result.Should().Be(expected);
    }
}
