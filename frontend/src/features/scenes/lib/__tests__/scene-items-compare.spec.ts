import { describe, expect, it } from "vitest";
import { itemsEqual, withoutAttributesWhenOff } from "../scene-draft";

const item = (overrides = {}) => ({
	deviceId: "a",
	isOn: true,
	brightness: 40 as number | null,
	colorHex: null as string | null,
	colorTempPercent: null as number | null,
	...overrides,
});

// Cor de dado do usuário (`colorHex` da luz), não token de design.
const COLOR_A = "#112233"; // design-token-lint-ignore

describe("withoutAttributesWhenOff", () => {
	it("withoutAttributesWhenOff_ItemThatTurnsOn_ShouldBeLeftAlone", () => {
		const on = item();

		expect(withoutAttributesWhenOff(on)).toEqual(on);
	});

	it("withoutAttributesWhenOff_ItemThatTurnsOff_ShouldDropAttributes", () => {
		expect(
			withoutAttributesWhenOff(
				item({ isOn: false, colorHex: COLOR_A, colorTempPercent: 10 }),
			),
		).toEqual({
			deviceId: "a",
			isOn: false,
			brightness: null,
			colorHex: null,
			colorTempPercent: null,
		});
	});
});

describe("itemsEqual", () => {
	it("itemsEqual_SameItems_ShouldBeEqual", () => {
		expect(
			itemsEqual(
				[item(), item({ deviceId: "b" })],
				[item(), item({ deviceId: "b" })],
			),
		).toBe(true);
	});

	it("itemsEqual_DifferentLength_ShouldNotBeEqual", () => {
		expect(itemsEqual([item()], [])).toBe(false);
	});

	it("itemsEqual_ChangedPowerOrBrightness_ShouldNotBeEqual", () => {
		expect(itemsEqual([item()], [item({ isOn: false })])).toBe(false);
		expect(itemsEqual([item()], [item({ brightness: 41 })])).toBe(false);
	});

	it("itemsEqual_OnlyAttributesOfAnItemThatIsOffDiffer_ShouldBeEqual", () => {
		expect(
			itemsEqual(
				[item({ isOn: false, brightness: 40 })],
				[item({ isOn: false, brightness: null })],
			),
		).toBe(true);
	});
});
