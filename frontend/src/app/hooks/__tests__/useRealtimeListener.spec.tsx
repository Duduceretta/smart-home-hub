import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { User } from "firebase/auth";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { deviceGroupsKeys } from "@/features/device-groups/hooks/device-groups.keys";
import type { DeviceGroup } from "@/features/device-groups/types/device-groups.types";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import type { Device } from "@/features/devices/types/devices.types";
import { roomsKeys } from "@/features/rooms/hooks/rooms.keys";
import { useRealtimeListener } from "../useRealtimeListener";

const mockConnection = {
	on: vi.fn(),
	off: vi.fn(),
	onreconnecting: vi.fn(),
	onreconnected: vi.fn(),
	onclose: vi.fn(),
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/core/lib/signalr", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/core/lib/signalr")>();
	return {
		...actual,
		createSignalRConnection: () => mockConnection,
	};
});

function getRegisteredHandler(event: string) {
	const call = mockConnection.on.mock.calls.find(([e]) => e === event);
	return call?.[1] as ((payload?: unknown) => void) | undefined;
}

const mockUser: User = {
	uid: "test-user-uid",
	email: "user@test.com",
	emailVerified: true,
	isAnonymous: false,
	metadata: {},
	providerData: [],
	refreshToken: "",
	tenantId: null,
	delete: vi.fn(),
	getIdToken: vi.fn().mockResolvedValue("mock-token"),
	getIdTokenResult: vi.fn(),
	reload: vi.fn(),
	toJSON: vi.fn(),
	displayName: "Test User",
	phoneNumber: null,
	photoURL: null,
	providerId: "firebase",
};

const baseDevice: Device = {
	id: "d-1",
	name: "Luz da Sala",
	brand: "Tuya",
	externalId: "EXT-1",
	ipAddress: null,
	type: 1,
	integrationType: 8,
	category: "light",
	room: "Sala",
	roomId: null,
	isOnline: true,
	isOn: true,
	lastActivityMinutes: 0,
	supportsColor: true,
	supportsColorOverride: null,
	brightness: 40,
	// design-token-lint-ignore
	colorHex: "#FFFFFF",
	colorTempPercent: 50,
};

describe("useRealtimeListener — preview de arraste (DeviceControlPreview/GroupControlPreview)", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity } },
		});
		useAuthStore.setState({ user: mockUser, isLoading: false });
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("DeviceControlPreview_ShouldMirrorFieldsIntoListAndDetailCache_WithoutRefetch", () => {
		queryClient.setQueryData(devicesKeys.lists(), {
			items: [baseDevice],
			page: 1,
			pageSize: 20,
			totalCount: 1,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		});
		queryClient.setQueryData(devicesKeys.detail("d-1"), baseDevice);

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		renderHook(() => useRealtimeListener(), { wrapper });

		const handler = getRegisteredHandler("DeviceControlPreview");
		expect(handler).toBeDefined();

		handler?.({ deviceId: "d-1", brightnessPercent: 77 });

		const listData = queryClient.getQueryData<{ items: Device[] }>(
			devicesKeys.lists(),
		);
		expect(listData?.items[0].brightness).toBe(77);
		// Campos não enviados neste frame permanecem intocados.
		// design-token-lint-ignore
		expect(listData?.items[0].colorHex).toBe("#FFFFFF");

		const detailData = queryClient.getQueryData<Device>(
			devicesKeys.detail("d-1"),
		);
		expect(detailData?.brightness).toBe(77);

		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it("DeviceControlPreview_ForUnknownDevice_ShouldNotThrowAndShouldLeaveOtherDevicesUntouched", () => {
		queryClient.setQueryData(devicesKeys.lists(), {
			items: [baseDevice],
			page: 1,
			pageSize: 20,
			totalCount: 1,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		});

		renderHook(() => useRealtimeListener(), { wrapper });
		const handler = getRegisteredHandler("DeviceControlPreview");

		expect(() =>
			handler?.({ deviceId: "d-does-not-exist", brightnessPercent: 1 }),
		).not.toThrow();

		const listData = queryClient.getQueryData<{ items: Device[] }>(
			devicesKeys.lists(),
		);
		expect(listData?.items[0].brightness).toBe(40);
	});

	it("GroupControlPreview_ShouldMirrorAverageBrightnessIntoGroupListCache", () => {
		const group: DeviceGroup = {
			id: "g-1",
			name: "Sala",
			devices: [],
			averageBrightness: 30,
		};
		queryClient.setQueryData(deviceGroupsKeys.lists(), [group]);

		renderHook(() => useRealtimeListener(), { wrapper });
		const handler = getRegisteredHandler("GroupControlPreview");
		expect(handler).toBeDefined();

		handler?.({ groupId: "g-1", brightnessPercent: 88 });

		const groups = queryClient.getQueryData<DeviceGroup[]>(
			deviceGroupsKeys.lists(),
		);
		expect(groups?.[0].averageBrightness).toBe(88);
	});
});

describe("useRealtimeListener — ReceiveTelemetryUpdate", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.useFakeTimers();
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity } },
		});
		useAuthStore.setState({ user: mockUser, isLoading: false });
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("ReceiveTelemetryUpdate_ShouldInvalidateOverviewAndTargetedDeviceAndRoom_AfterDebounce", () => {
		const deviceInRoom: Device = {
			...baseDevice,
			id: "d-1",
			roomId: "r-1",
		};
		queryClient.setQueryData(devicesKeys.detail("d-1"), deviceInRoom);

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		renderHook(() => useRealtimeListener(), { wrapper });

		const handler = getRegisteredHandler("ReceiveTelemetryUpdate");
		expect(handler).toBeDefined();

		handler?.({
			deviceId: "d-1",
			powerUsageWatts: 15.5,
			temperatureCelsius: 22.0,
			timestamp: "2026-09-05T20:00:00Z",
		});

		// Before 800ms debounce expires, no invalidation should have run
		vi.advanceTimersByTime(799);
		expect(invalidateSpy).not.toHaveBeenCalled();

		// At 800ms debounce expiry
		vi.advanceTimersByTime(1);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: dashboardKeys.overview(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: [...devicesKeys.energies(), "d-1"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: roomsKeys.climate("r-1"),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: [...roomsKeys.detail("r-1"), "energy"],
		});
	});

	it("ReceiveTelemetryUpdate_ShouldNotInvalidateUnrelatedDeviceOrRoom", () => {
		const deviceInRoom: Device = {
			...baseDevice,
			id: "d-1",
			roomId: "r-1",
		};
		queryClient.setQueryData(devicesKeys.detail("d-1"), deviceInRoom);

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		renderHook(() => useRealtimeListener(), { wrapper });

		const handler = getRegisteredHandler("ReceiveTelemetryUpdate");
		handler?.({
			deviceId: "d-1",
			roomId: "r-1",
			powerUsageWatts: 10,
			temperatureCelsius: 21,
			timestamp: "2026-09-05T20:00:00Z",
		});

		vi.advanceTimersByTime(800);

		// Must NOT invalidate unrelated device d-2 or unrelated room r-2
		expect(invalidateSpy).not.toHaveBeenCalledWith({
			queryKey: [...devicesKeys.energies(), "d-2"],
		});
		expect(invalidateSpy).not.toHaveBeenCalledWith({
			queryKey: roomsKeys.climate("r-2"),
		});
		expect(invalidateSpy).not.toHaveBeenCalledWith({
			queryKey: [...roomsKeys.detail("r-2"), "energy"],
		});
	});

	it("ReceiveTelemetryUpdate_Bursts_ShouldCoalesceIntoSingleBatchAfterDebounce", () => {
		queryClient.setQueryData(devicesKeys.detail("d-1"), {
			...baseDevice,
			id: "d-1",
			roomId: "r-1",
		});
		queryClient.setQueryData(devicesKeys.detail("d-2"), {
			...baseDevice,
			id: "d-2",
			roomId: "r-2",
		});

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		renderHook(() => useRealtimeListener(), { wrapper });
		const handler = getRegisteredHandler("ReceiveTelemetryUpdate");

		// Event 1 at t=0
		handler?.({
			deviceId: "d-1",
			powerUsageWatts: 12,
			temperatureCelsius: 23,
			timestamp: "2026-09-05T20:00:00Z",
		});

		// Advance 400ms (timer at 400ms)
		vi.advanceTimersByTime(400);
		expect(invalidateSpy).not.toHaveBeenCalled();

		// Event 2 at t=400ms resets debounce timer
		handler?.({
			deviceId: "d-2",
			powerUsageWatts: 50,
			temperatureCelsius: 25,
			timestamp: "2026-09-05T20:00:01Z",
		});

		// Advance another 400ms (t=800ms from start, but only 400ms from event 2)
		vi.advanceTimersByTime(400);
		expect(invalidateSpy).not.toHaveBeenCalled();

		// Advance remaining 400ms (t=1200ms, 800ms from event 2)
		vi.advanceTimersByTime(400);

		// Overview should be invalidated exactly ONCE
		const overviewCalls = invalidateSpy.mock.calls.filter(
			([arg]) =>
				JSON.stringify(arg?.queryKey) ===
				JSON.stringify(dashboardKeys.overview()),
		);
		expect(overviewCalls).toHaveLength(1);

		// Both devices and both rooms invalidated in this coalesced batch
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: [...devicesKeys.energies(), "d-1"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: [...devicesKeys.energies(), "d-2"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: roomsKeys.climate("r-1"),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: roomsKeys.climate("r-2"),
		});
	});
});
