import { describe, expect, it } from "vitest";
import { formatRoomEnergy, formatRoomPower } from "../format-room-energy";

describe("format-room-energy Unit Tests", () => {
	describe("formatRoomEnergy", () => {
		it("formatRoomEnergy_ZeroKwh_ShouldReturnZeroWh", () => {
			// Arrange & Act
			const result = formatRoomEnergy(0);

			// Assert
			expect(result).toEqual({ value: "0", unit: "Wh" });
		});

		it("formatRoomEnergy_SmallSub10Wh_ShouldReturnOneDecimalWh", () => {
			// Arrange & Act (0.005 kWh = 5 Wh)
			const result = formatRoomEnergy(0.005);

			// Assert
			expect(result).toEqual({ value: "5.0", unit: "Wh" });
		});

		it("formatRoomEnergy_Sub1KwhAbove10Wh_ShouldReturnRoundedWh", () => {
			// Arrange & Act (0.25 kWh = 250 Wh)
			const result = formatRoomEnergy(0.25);

			// Assert
			expect(result).toEqual({ value: "250", unit: "Wh" });
		});

		it("formatRoomEnergy_Under10Kwh_ShouldReturnTwoDecimalKwh", () => {
			// Arrange & Act
			const result = formatRoomEnergy(4.567);

			// Assert
			expect(result).toEqual({ value: "4.57", unit: "kWh" });
		});

		it("formatRoomEnergy_Above10Kwh_ShouldReturnOneDecimalKwh", () => {
			// Arrange & Act
			const result = formatRoomEnergy(42.567);

			// Assert
			expect(result).toEqual({ value: "42.6", unit: "kWh" });
		});
	});

	describe("formatRoomPower", () => {
		it("formatRoomPower_ZeroKw_ShouldReturnZeroW", () => {
			// Arrange & Act
			const result = formatRoomPower(0);

			// Assert
			expect(result).toEqual({ value: "0", unit: "W" });
		});

		it("formatRoomPower_SmallSub10W_ShouldReturnOneDecimalW", () => {
			// Arrange & Act (0.007 kW = 7 W)
			const result = formatRoomPower(0.007);

			// Assert
			expect(result).toEqual({ value: "7.0", unit: "W" });
		});

		it("formatRoomPower_Sub1KwAbove10W_ShouldReturnRoundedW", () => {
			// Arrange & Act (0.15 kW = 150 W)
			const result = formatRoomPower(0.15);

			// Assert
			expect(result).toEqual({ value: "150", unit: "W" });
		});

		it("formatRoomPower_Under10Kw_ShouldReturnTwoDecimalKw", () => {
			// Arrange & Act
			const result = formatRoomPower(3.5);

			// Assert
			expect(result).toEqual({ value: "3.50", unit: "kW" });
		});

		it("formatRoomPower_Above10Kw_ShouldReturnOneDecimalKw", () => {
			// Arrange & Act
			const result = formatRoomPower(18.75);

			// Assert
			expect(result).toEqual({ value: "18.8", unit: "kW" });
		});
	});
});
