import { describe, expect, it } from "vitest";
import {
	createSceneDeviceMock,
	createSceneItemMock,
} from "@/testing/mocks/scenes.mock";
import {
	createItemFromDevice,
	itemFromSceneItem,
	orderItemsByDevices,
} from "../scene-draft";

// Cores de dado do usuário (`colorHex` da luz), não tokens de design.
const COLOR_A = "#112233"; // design-token-lint-ignore
const COLOR_B = "#445566"; // design-token-lint-ignore

describe("scene-draft", () => {
	describe("createItemFromDevice", () => {
		it("createItemFromDevice_TuyaLocalLight_ShouldCopyItsCurrentState", () => {
			const device = createSceneDeviceMock({
				id: "lamp",
				type: 1,
				integrationType: 8,
				isOn: true,
				brightness: 70,
				colorHex: COLOR_A,
				colorTempPercent: 30,
			});

			expect(createItemFromDevice(device)).toEqual({
				deviceId: "lamp",
				isOn: true,
				brightness: 70,
				colorHex: COLOR_A,
				colorTempPercent: 30,
			});
		});

		it("createItemFromDevice_LightThatNeverHadAttributes_ShouldKeepThemUnchanged", () => {
			const device = createSceneDeviceMock({
				type: 1,
				integrationType: 8,
				isOn: true,
				brightness: null,
				colorHex: null,
				colorTempPercent: null,
			});

			expect(createItemFromDevice(device)).toMatchObject({
				brightness: null,
				colorHex: null,
				colorTempPercent: null,
			});
		});

		it("createItemFromDevice_LightWithoutTuyaLocalControl_ShouldDropAttributesTheApiWouldReject", () => {
			const device = createSceneDeviceMock({
				type: 1,
				integrationType: 1,
				isOn: true,
				brightness: 80,
			});

			expect(createItemFromDevice(device)).toMatchObject({
				isOn: true,
				brightness: null,
				colorHex: null,
				colorTempPercent: null,
			});
		});

		it("createItemFromDevice_Switch_ShouldOnlyCarryThePowerState", () => {
			const device = createSceneDeviceMock({
				id: "plug",
				type: 2,
				integrationType: 8,
				isOn: false,
				brightness: 50,
			});

			expect(createItemFromDevice(device)).toEqual({
				deviceId: "plug",
				isOn: false,
				brightness: null,
				colorHex: null,
				colorTempPercent: null,
			});
		});
	});

	describe("itemFromSceneItem", () => {
		it("itemFromSceneItem_ShouldMapTheApiItemToAFormItem", () => {
			const item = createSceneItemMock({
				deviceId: "lamp",
				isOn: true,
				brightness: 40,
				colorHex: COLOR_B,
				colorTempPercent: null,
			});

			expect(itemFromSceneItem(item)).toEqual({
				deviceId: "lamp",
				isOn: true,
				brightness: 40,
				colorHex: COLOR_B,
				colorTempPercent: null,
			});
		});
	});

	describe("orderItemsByDevices", () => {
		const item = (deviceId: string) => ({
			deviceId,
			isOn: true,
			brightness: null,
			colorHex: null,
			colorTempPercent: null,
		});
		const devices = [
			createSceneDeviceMock({ id: "a" }),
			createSceneDeviceMock({ id: "b" }),
			createSceneDeviceMock({ id: "c" }),
		];

		it("orderItemsByDevices_ShouldFollowTheOrderOfTheDeviceList", () => {
			const ordered = orderItemsByDevices([item("c"), item("a")], devices);

			expect(ordered.map((entry) => entry.deviceId)).toEqual(["a", "c"]);
		});

		it("orderItemsByDevices_ItemOfAnUnknownDevice_ShouldGoLastInsteadOfBeingDropped", () => {
			const ordered = orderItemsByDevices([item("ghost"), item("b")], devices);

			expect(ordered.map((entry) => entry.deviceId)).toEqual(["b", "ghost"]);
		});
	});
});
