import type { Page } from "@playwright/test";

/**
 * Backend origin (matches VITE_API_URL's local fallback in api.client.ts).
 * Route patterns MUST be anchored to this origin instead of a leading "**"
 * wildcard — a bare pattern can also match Vite-served module paths that
 * happen to contain the same substring, hijacking the script response and
 * breaking the app bundle.
 */
const API_ORIGIN = "http://localhost:5252";

export interface MockRoom {
	id: string;
	name: string;
	icon: string | null;
	automationCount: number;
}

export const mockRoom: MockRoom = {
	id: "e2e-room-01",
	name: "Sala de Estar",
	icon: "chair",
	automationCount: 0,
};

interface CreateRoomPayload {
	name: string;
	icon?: string | null;
}

/**
 * Intercepts the full rooms CRUD surface (GET list, GET by id, POST, PUT,
 * DELETE) backed by an in-memory array scoped to this call, so
 * created/updated/deleted rooms are reflected consistently across the
 * refetches TanStack Query triggers after each mutation — same pattern as
 * `mockDevicesApi` in `devices-mocks.ts`.
 */
export async function mockRoomsCrudApi(
	page: Page,
	initialRooms: MockRoom[] = [mockRoom],
): Promise<{ rooms: MockRoom[] }> {
	const state = { rooms: [...initialRooms] };
	let sequence = 0;

	await page.route(`${API_ORIGIN}/api/rooms/*`, async (route) => {
		const method = route.request().method();
		const id = route.request().url().split("/api/rooms/")[1];

		if (method === "GET") {
			const room = state.rooms.find((r) => r.id === id);
			if (!room) {
				await route.fulfill({ status: 404 });
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(room),
			});
			return;
		}

		if (method === "PUT") {
			const payload = route.request().postDataJSON() as CreateRoomPayload;
			const room = state.rooms.find((r) => r.id === id);
			if (room) {
				room.name = payload.name;
				room.icon = payload.icon ?? null;
			}
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(room),
			});
			return;
		}

		if (method === "DELETE") {
			state.rooms = state.rooms.filter((r) => r.id !== id);
			await route.fulfill({ status: 204 });
			return;
		}

		await route.fallback();
	});

	await page.route(`${API_ORIGIN}/api/rooms*`, async (route) => {
		const method = route.request().method();

		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(state.rooms),
			});
			return;
		}

		if (method === "POST") {
			const payload = route.request().postDataJSON() as CreateRoomPayload;
			sequence += 1;

			const newRoom: MockRoom = {
				id: `e2e-room-${sequence}`,
				name: payload.name,
				icon: payload.icon ?? null,
				automationCount: 0,
			};
			state.rooms.push(newRoom);

			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					message: "Ambiente criado com sucesso!",
					roomId: newRoom.id,
				}),
			});
			return;
		}

		await route.fallback();
	});

	return state;
}

/** Intercepts `POST /api/rooms/:id/devices/turn-on|turn-off`. */
export async function mockRoomPowerApi(page: Page): Promise<void> {
	await page.route(
		`${API_ORIGIN}/api/rooms/*/devices/turn-on`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					succeededCount: 1,
					failedCount: 0,
					totalCount: 1,
				}),
			});
		},
	);

	await page.route(
		`${API_ORIGIN}/api/rooms/*/devices/turn-off`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					succeededCount: 1,
					failedCount: 0,
					totalCount: 1,
				}),
			});
		},
	);
}

/** Intercepts `GET /api/rooms/:id/climate`. */
export async function mockRoomClimateApi(
	page: Page,
	overrides: Record<string, unknown> = {},
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/rooms/*/climate`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				hasClimateSensor: false,
				temperatureCelsius: null,
				humidityPercent: null,
				readingTimestampUtc: null,
				...overrides,
			}),
		});
	});
}

/** Intercepts `GET /api/rooms/:id/energy`. */
export async function mockRoomEnergyApi(
	page: Page,
	overrides: Record<string, unknown> = {},
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/rooms/*/energy*`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				hasEnergyData: false,
				chart: [],
				totalConsumptionKwh: 0,
				isEnergyEstimated: false,
				...overrides,
			}),
		});
	});
}

/** Intercepts `GET /api/rooms/:id/automations`. */
export async function mockRoomAutomationsApi(
	page: Page,
	automations: unknown[] = [],
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/rooms/*/automations`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(automations),
		});
	});
}

/** Intercepts `GET /api/rooms/:id/events`. */
export async function mockRoomActivityApi(
	page: Page,
	entries: unknown[] = [],
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/rooms/*/events*`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				items: entries,
				page: 1,
				pageSize: 8,
				totalCount: entries.length,
			}),
		});
	});
}

/**
 * Groups every non-CRUD Rooms sub-resource mock (power/climate/energy/
 * automations/activity) with harmless empty/omitted defaults, for tests
 * that only care about the room list/detail shell, not a specific section.
 */
export async function mockRoomDetailEssentials(page: Page): Promise<void> {
	await mockRoomPowerApi(page);
	await mockRoomClimateApi(page);
	await mockRoomEnergyApi(page);
	await mockRoomAutomationsApi(page);
	await mockRoomActivityApi(page);
}

export interface MockPickerDevice {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	type: number;
	integrationType: number;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
}

/**
 * Intercepts the `/api/devices` surface as consumed by the Rooms feature's
 * device-assignment picker (`fetchAssignableDevices`, `pageSize=200`) plus
 * the toggle/assignment mutations fired from `RoomDeviceGrid`/
 * `RoomFormDialog` — kept separate from `devices-mocks.ts`'s
 * `mockDevicesApi` (different DTO shape, and that one never needed PUT
 * support) so Rooms e2e specs don't depend on the Devices feature's mocks.
 */
export async function mockAssignableDevicesApi(
	page: Page,
	initialDevices: MockPickerDevice[] = [],
): Promise<{ devices: MockPickerDevice[] }> {
	const state = { devices: [...initialDevices] };

	await page.route(`${API_ORIGIN}/api/devices/*/toggle`, async (route) => {
		const match = route
			.request()
			.url()
			.match(/\/devices\/([^/]+)\/toggle/);
		const device = state.devices.find((d) => d.id === match?.[1]);
		if (device) device.isOn = !device.isOn;

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ message: "Dispositivo alternado com sucesso!" }),
		});
	});

	await page.route(`${API_ORIGIN}/api/devices/*`, async (route) => {
		if (route.request().method() !== "PUT") {
			await route.fallback();
			return;
		}

		const id = route.request().url().split("/api/devices/")[1];
		const payload = route.request().postDataJSON() as {
			roomId?: string | null;
		};
		const device = state.devices.find((d) => d.id === id);
		if (device) device.roomId = payload.roomId ?? null;

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(device),
		});
	});

	await page.route(`${API_ORIGIN}/api/devices*`, async (route) => {
		if (route.request().method() !== "GET") {
			await route.fallback();
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(state.devices),
		});
	});

	return state;
}
