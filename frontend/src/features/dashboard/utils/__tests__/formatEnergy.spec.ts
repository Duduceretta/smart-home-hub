import { describe, expect, it } from "vitest";
import { formatEnergy, formatPower } from "../formatEnergy";

describe("formatEnergy", () => {
	it("formatEnergy_ZeroKwh_ShouldReturnZeroWh", () => {
		const result = formatEnergy(0);

		expect(result).toEqual({ value: "0", unit: "Wh" });
	});

	it("formatEnergy_SmallSubWattHourValue_ShouldReturnOneDecimalWh", () => {
		const result = formatEnergy(0.0006);

		expect(result).toEqual({ value: "0.6", unit: "Wh" });
	});

	it("formatEnergy_ValueBelowOneKwh_ShouldAutoScaleToRoundedWh", () => {
		const result = formatEnergy(0.13);

		expect(result).toEqual({ value: "130", unit: "Wh" });
	});

	it("formatEnergy_ValueAtOrAboveOneKwh_ShouldStayInKwh", () => {
		const result = formatEnergy(1);

		expect(result).toEqual({ value: "1.00", unit: "kWh" });
	});

	it("formatEnergy_LargeKwhValue_ShouldRoundToOneDecimal", () => {
		const result = formatEnergy(12.345);

		expect(result).toEqual({ value: "12.3", unit: "kWh" });
	});
});

describe("formatPower", () => {
	it("formatPower_ZeroKw_ShouldReturnZeroW", () => {
		const result = formatPower(0);

		expect(result).toEqual({ value: "0", unit: "W" });
	});

	it("formatPower_ValueBelowOneKw_ShouldAutoScaleToRoundedW", () => {
		const result = formatPower(0.12);

		expect(result).toEqual({ value: "120", unit: "W" });
	});

	it("formatPower_ValueAtOrAboveOneKw_ShouldStayInKw", () => {
		const result = formatPower(1.5);

		expect(result).toEqual({ value: "1.50", unit: "kW" });
	});
});
