import type { Page } from "@playwright/test";

const API_ORIGIN = "http://localhost:5252";

export interface MockDeviceInGroup {
	id: string;
	name: string;
	brand: string;
	type: number;
	room: string | null;
	isOnline: boolean;
	isOn: boolean;
	brightness?: number;
}

export interface MockDeviceGroup {
	id: string;
	name: string;
	icon: string | null;
	deviceCount: number;
	onCount: number;
	averageBrightness: number | null;
	devices: MockDeviceInGroup[];
}

export const mockGroupDevices: MockDeviceInGroup[] = [
	{
		id: "e2e-dev-light-1",
		name: "Lâmpada Teto",
		brand: "Philips Hue",
		type: 1,
		room: "Sala",
		isOnline: true,
		isOn: true,
		brightness: 40,
	},
	{
		id: "e2e-dev-light-2",
		name: "Fita LED",
		brand: "Yeelight",
		type: 1,
		room: "Sala",
		isOnline: true,
		isOn: true,
		brightness: 60,
	},
];

export async function mockDeviceGroupsApi(
	page: Page,
	initialGroups: MockDeviceGroup[] = [],
): Promise<{ groups: MockDeviceGroup[] }> {
	const state = { groups: [...initialGroups] };
	let sequence = 0;

	// Mock devices for picker
	await page.route(`${API_ORIGIN}/api/devices*`, async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockGroupDevices),
			});
			return;
		}
		await route.fallback();
	});

	// Mock automations for detail panel subresources
	await page.route(
		`${API_ORIGIN}/api/device-groups/*/automations*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		},
	);

	await page.route(`${API_ORIGIN}/api/automations*`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	// Mock brightness endpoint
	await page.route(
		`${API_ORIGIN}/api/device-groups/*/brightness`,
		async (route) => {
			const match = route
				.request()
				.url()
				.match(/\/device-groups\/([^/]+)\/brightness/);
			const groupId = match?.[1];
			const payload = route.request().postDataJSON() as { brightness: number };
			const group = state.groups.find((g) => g.id === groupId);
			if (group) {
				group.averageBrightness = payload.brightness;
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ message: "Brilho ajustado com sucesso!" }),
			});
		},
	);

	// Mock CRUD
	await page.route(`${API_ORIGIN}/api/device-groups*`, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (url.includes("/brightness") || url.includes("/automations")) {
			await route.fallback();
			return;
		}

		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(state.groups),
			});
			return;
		}

		if (method === "POST") {
			const payload = route.request().postDataJSON() as {
				name: string;
				icon?: string;
				deviceIds: string[];
			};
			sequence += 1;
			const selectedDevices = mockGroupDevices.filter((d) =>
				payload.deviceIds.includes(d.id),
			);
			const newGroup: MockDeviceGroup = {
				id: `e2e-group-${sequence}`,
				name: payload.name,
				icon: payload.icon ?? "layers",
				deviceCount: selectedDevices.length,
				onCount: selectedDevices.filter((d) => d.isOn).length,
				averageBrightness: 50,
				devices: selectedDevices,
			};
			state.groups.push(newGroup);

			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					message: "Grupo criado com sucesso!",
					groupId: newGroup.id,
				}),
			});
			return;
		}

		await route.fallback();
	});

	return state;
}
