import { describe, expect, it } from "vitest";
import { createSceneDeviceMock } from "@/testing/mocks/scenes.mock";
import { toPayloadItems } from "../scene-draft";

const item = (deviceId: string, isOn: boolean, brightness: number | null) => ({
	deviceId,
	isOn,
	brightness,
	colorHex: null,
	colorTempPercent: null,
});

// Cor de dado do usuário (`colorHex` da luz), não token de design.
const COLOR_A = "#112233"; // design-token-lint-ignore

describe("toPayloadItems", () => {
	const devices = [
		createSceneDeviceMock({ id: "a" }),
		createSceneDeviceMock({ id: "b" }),
	];

	it("toPayloadItems_ItemThatTurnsTheDeviceOff_ShouldDropItsLightAttributes", () => {
		const [payload] = toPayloadItems(
			[{ ...item("a", false, 40), colorHex: COLOR_A, colorTempPercent: 20 }],
			devices,
		);

		expect(payload).toEqual({
			deviceId: "a",
			isOn: false,
			brightness: null,
			colorHex: null,
			colorTempPercent: null,
		});
	});

	it("toPayloadItems_ItemThatTurnsTheDeviceOn_ShouldKeepItsAttributes", () => {
		const [payload] = toPayloadItems([item("a", true, 40)], devices);

		expect(payload).toMatchObject({ isOn: true, brightness: 40 });
	});

	it("toPayloadItems_ShouldFollowTheOrderOfTheDeviceList", () => {
		const payload = toPayloadItems(
			[item("b", true, null), item("a", true, null)],
			devices,
		);

		expect(payload.map((entry) => entry.deviceId)).toEqual(["a", "b"]);
	});
});
