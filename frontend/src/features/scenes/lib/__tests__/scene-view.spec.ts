import { describe, expect, it } from "vitest";
import {
	createSceneDeviceMock,
	createSceneItemMock,
	createSceneMock,
} from "@/testing/mocks/scenes.mock";
import {
	countOfflineDevices,
	filterScenes,
	listRoomsInScenes,
	toDeviceIndex,
} from "../scene-view";

const lamp = createSceneDeviceMock({
	id: "lamp",
	name: "Luz da Sala",
	room: "Sala",
});
const tv = createSceneDeviceMock({
	id: "tv",
	name: "Smart-TV-Pro",
	room: "Sala",
	type: 8,
});
const bedLamp = createSceneDeviceMock({
	id: "bed",
	name: "Luz do Quarto",
	room: "Quarto",
});
const hallLamp = createSceneDeviceMock({
	id: "hall",
	name: "Lâmpada do Corredor",
	room: "Corredor",
	isOnline: false,
});
const index = toDeviceIndex([lamp, tv, bedLamp, hallLamp]);

const sceneOf = (name: string, deviceIds: string[], id = name) =>
	createSceneMock({
		id,
		name,
		items: deviceIds.map((deviceId) => createSceneItemMock({ deviceId })),
	});

const cinema = sceneOf("Modo Cinema", ["lamp", "tv"]);
const night = sceneOf("Boa Noite", ["bed", "hall"]);
const away = sceneOf("Sair de Casa", ["lamp", "bed"]);
const scenes = [cinema, night, away];

describe("filterScenes", () => {
	it("filterScenes_NoFilter_ShouldKeepEverything", () => {
		expect(filterScenes(scenes, index, { query: "", room: null })).toEqual(
			scenes,
		);
	});

	it("filterScenes_QueryMatchingTheSceneName_ShouldIgnoreCaseAndAccents", () => {
		expect(
			filterScenes(scenes, index, { query: "boa noite", room: null }),
		).toEqual([night]);
		expect(
			filterScenes(scenes, index, { query: "SAIR DE CASA", room: null }),
		).toEqual([away]);
	});

	it("filterScenes_QueryMatchingADeviceName_ShouldReturnTheScenesThatUseIt", () => {
		expect(
			filterScenes(scenes, index, { query: "smart-tv", room: null }),
		).toEqual([cinema]);
	});

	it("filterScenes_Room_ShouldKeepScenesThatTouchAnyDeviceOfThatRoom", () => {
		expect(filterScenes(scenes, index, { query: "", room: "Quarto" })).toEqual([
			night,
			away,
		]);
	});

	it("filterScenes_QueryAndRoomTogether_ShouldApplyBoth", () => {
		expect(
			filterScenes(scenes, index, { query: "sair", room: "Quarto" }),
		).toEqual([away]);
		expect(
			filterScenes(scenes, index, { query: "sair", room: "Sala" }),
		).toEqual([away]);
		expect(
			filterScenes(scenes, index, { query: "cinema", room: "Quarto" }),
		).toEqual([]);
	});

	it("filterScenes_ItemOfADeviceMissingFromTheIndex_ShouldNotCrash", () => {
		const ghost = sceneOf("Fantasma", ["gone"]);

		expect(filterScenes([ghost], index, { query: "", room: "Sala" })).toEqual(
			[],
		);
		expect(
			filterScenes([ghost], index, { query: "fantasma", room: null }),
		).toEqual([ghost]);
	});
});

describe("listRoomsInScenes", () => {
	it("listRoomsInScenes_ShouldReturnTheDistinctRoomsOfTheSceneDevicesSorted", () => {
		expect(listRoomsInScenes(scenes, index)).toEqual([
			"Corredor",
			"Quarto",
			"Sala",
		]);
	});

	it("listRoomsInScenes_NoScenes_ShouldReturnNothing", () => {
		expect(listRoomsInScenes([], index)).toEqual([]);
	});
});

describe("countOfflineDevices", () => {
	it("countOfflineDevices_ShouldCountSceneDevicesThatAreOffline", () => {
		expect(countOfflineDevices(night, index)).toBe(1);
		expect(countOfflineDevices(cinema, index)).toBe(0);
	});

	it("countOfflineDevices_UnknownDevice_ShouldNotCountAsOffline", () => {
		expect(countOfflineDevices(sceneOf("X", ["gone"]), index)).toBe(0);
	});
});
