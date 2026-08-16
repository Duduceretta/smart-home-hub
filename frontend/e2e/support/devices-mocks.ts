import type { Page } from "@playwright/test";

/**
 * Backend origin (matches VITE_API_URL's local fallback in api.client.ts).
 * Route patterns MUST be anchored to this origin instead of a leading "**"
 * wildcard — a bare "**\/api/devices*" also matches the Vite-served module
 * path "src/features/devices/api/devices.api.ts" (it contains the literal
 * substring "/api/devices"), hijacking the script response and breaking
 * the whole app bundle.
 */
const API_ORIGIN = "http://localhost:5252";

export interface MockRoom {
	id: string;
	name: string;
	icon: string | null;
}

export const mockRoom: MockRoom = {
	id: "e2e-room-01",
	name: "Sala de Estar",
	icon: null,
};

/** Intercepts GET /api/rooms with a fixed, deterministic room list. */
export async function mockRoomsApi(
	page: Page,
	rooms: MockRoom[] = [mockRoom],
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/rooms*`, async (route) => {
		if (route.request().method() !== "GET") {
			await route.fallback();
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(rooms),
		});
	});
}

export interface MockDevice {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	ipAddress: string | null;
	type: number;
	category: string;
	room: string | null;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
	lastActivityMinutes: number;
}

interface CreateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: number;
	roomId?: string | null;
}

/**
 * Intercepts the full devices CRUD surface (GET/POST list, DELETE and
 * toggle by id) backed by an in-memory array scoped to this call, so
 * created/deleted/toggled devices are reflected consistently across the
 * refetches TanStack Query triggers after each mutation.
 */
export async function mockDevicesApi(
	page: Page,
	initialDevices: MockDevice[] = [],
): Promise<{ devices: MockDevice[] }> {
	const state = { devices: [...initialDevices] };
	let sequence = 0;

	await page.route(`${API_ORIGIN}/api/devices/*/toggle`, async (route) => {
		const match = route
			.request()
			.url()
			.match(/\/devices\/([^/]+)\/toggle/);
		const device = state.devices.find((d) => d.id === match?.[1]);
		if (device) {
			device.isOn = !device.isOn;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ message: "Dispositivo alternado com sucesso!" }),
		});
	});

	await page.route(`${API_ORIGIN}/api/devices/*`, async (route) => {
		if (route.request().method() !== "DELETE") {
			await route.fallback();
			return;
		}

		const id = route.request().url().split("/api/devices/")[1];
		state.devices = state.devices.filter((d) => d.id !== id);

		await route.fulfill({ status: 204 });
	});

	await page.route(`${API_ORIGIN}/api/devices*`, async (route) => {
		const method = route.request().method();

		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(state.devices),
			});
			return;
		}

		if (method === "POST") {
			const payload = route.request().postDataJSON() as CreateDevicePayload;
			sequence += 1;

			const newDevice: MockDevice = {
				id: `e2e-device-${sequence}`,
				name: payload.name,
				brand: payload.brand,
				externalId: payload.externalId,
				ipAddress: payload.ipAddress ?? null,
				type: payload.type,
				category: "Iluminação",
				room: payload.roomId ? mockRoom.name : null,
				roomId: payload.roomId ?? null,
				isOnline: true,
				isOn: false,
				lastActivityMinutes: 0,
			};
			state.devices.push(newDevice);

			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					message: "Dispositivo criado com sucesso!",
					deviceId: newDevice.id,
				}),
			});
			return;
		}

		await route.fallback();
	});

	return state;
}
