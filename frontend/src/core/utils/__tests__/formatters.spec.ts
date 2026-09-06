import { describe, expect, it } from "vitest";
import { formatIpAddress, formatMacAddress } from "../formatters";

describe("formatMacAddress", () => {
	it("formatMacAddress_EmptyString_ShouldReturnEmptyString", () => {
		// Arrange & Act
		const result = formatMacAddress("");

		// Assert
		expect(result).toBe("");
	});

	it("formatMacAddress_ValidRawHex_ShouldFormatWithColonsAndUppercase", () => {
		// Arrange & Act
		const result = formatMacAddress("a1b2c3d4e5f6");

		// Assert
		expect(result).toBe("A1:B2:C3:D4:E5:F6");
	});

	it("formatMacAddress_WithNonHexCharacters_ShouldFilterOutInvalidChars", () => {
		// Arrange & Act
		const result = formatMacAddress("a1-b2-c3-d4-e5-zz-f6");

		// Assert
		expect(result).toBe("A1:B2:C3:D4:E5:F6");
	});

	it("formatMacAddress_LongerThan6Bytes_ShouldTruncateTo6Bytes", () => {
		// Arrange & Act
		const result = formatMacAddress("a1b2c3d4e5f67890");

		// Assert
		expect(result).toBe("A1:B2:C3:D4:E5:F6");
	});

	it("formatMacAddress_OnlyInvalidChars_ShouldReturnEmptyString", () => {
		// Arrange & Act
		const result = formatMacAddress("xyz!@#$%^&*()");

		// Assert
		expect(result).toBe("");
	});
});

describe("formatIpAddress", () => {
	it("formatIpAddress_EmptyString_ShouldReturnEmptyString", () => {
		// Arrange & Act
		const result = formatIpAddress("");

		// Assert
		expect(result).toBe("");
	});

	it("formatIpAddress_WhenDeleting_ShouldOnlyStripNonNumericAndKeepDots", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.1.abc", true);

		// Assert
		expect(result).toBe("192.168.1.");
	});

	it("formatIpAddress_ValidIp_ShouldPreserveCorrectFormat", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.1.100");

		// Assert
		expect(result).toBe("192.168.1.100");
	});

	it("formatIpAddress_OctetExceeding255_ShouldClampOctetTo255", () => {
		// Arrange & Act
		const result = formatIpAddress("192.300.1.1");

		// Assert
		expect(result).toBe("192.255.1.1");
	});

	it("formatIpAddress_PartLongerThanThreeDigits_ShouldSplitAndClampOverflow", () => {
		// Arrange & Act
		// Part 9999 -> first 3 digits 999 (>255) clamped to 255, overflow '9' pushed as next octet
		const result = formatIpAddress("9999");

		// Assert
		expect(result).toBe("255.9");
	});

	it("formatIpAddress_MoreThanFourOctets_ShouldCapAtFourOctets", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.1.1.99.100");

		// Assert
		expect(result).toBe("192.168.1.1");
	});

	it("formatIpAddress_TrailingDotUnderFourOctets_ShouldPreserveTrailingDot", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.");

		// Assert
		expect(result).toBe("192.168.");
	});

	it("formatIpAddress_ThreeDigitLastOctetUnderFourOctets_ShouldAutoAppendDot", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.001");

		// Assert
		expect(result).toBe("192.168.001.");
	});

	it("formatIpAddress_FourFullOctets_ShouldNotAppendDotAtEnd", () => {
		// Arrange & Act
		const result = formatIpAddress("192.168.1.100.");

		// Assert
		expect(result).toBe("192.168.1.100");
	});
});
