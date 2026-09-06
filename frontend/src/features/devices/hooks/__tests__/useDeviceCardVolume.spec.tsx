import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { describe, expect, it } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { DeviceTypeEnum, IntegrationTypeEnum } from "../../types/devices.types";
import { useDeviceCardVolume } from "../useDeviceCardVolume";

function createHookWrapper() {
	const queryClient = createTestQueryClient();
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe("useDeviceCardVolume", () => {
	it("should calculate flags for ADB controllable and online status", () => {
		const adbTv = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: true,
		});

		const { result: r1 } = renderHook(() => useDeviceCardVolume(adbTv), {
			wrapper: createHookWrapper(),
		});

		expect(r1.current.isAdbControllable).toBe(true);
		expect(r1.current.volumeDisabled).toBe(false);

		const offlineTv = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: false,
		});

		const { result: r2 } = renderHook(() => useDeviceCardVolume(offlineTv), {
			wrapper: createHookWrapper(),
		});

		expect(r2.current.volumeDisabled).toBe(true);

		const lgTv = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.LgWebOs,
			isOnline: true,
		});

		const { result: r3 } = renderHook(() => useDeviceCardVolume(lgTv), {
			wrapper: createHookWrapper(),
		});

		expect(r3.current.isAdbControllable).toBe(false);
		expect(r3.current.volumeDisabled).toBe(true);
	});

	it("should sync volume from media and debounce user volume mutations", async () => {
		let capturedVolume: unknown = null;
		server.use(
			http.get("*/api/devices/:id/media", () =>
				HttpResponse.json({
					volumePercent: 45,
					isPlaying: true,
					title: "Filme em Cartaz",
					artist: "Estúdio X",
				}),
			),
			http.put("*/api/devices/:id/volume", async ({ request }) => {
				capturedVolume = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);

		const adbTv = createDeviceMock({
			id: "tv-volume-1",
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: true,
		});

		const { result } = renderHook(() => useDeviceCardVolume(adbTv), {
			wrapper: createHookWrapper(),
		});

		// Wait for media to load and sync initial volume
		await waitFor(() => {
			expect(result.current.localVolume).toBe(45);
			expect(result.current.isPlaying).toBe(true);
		});

		// User starts dragging and updates volume
		act(() => {
			result.current.setIsDraggingVolume(true);
			result.current.userDraggedVolumeRef.current = true;
			result.current.setLocalVolume(70);
		});

		expect(result.current.localVolume).toBe(70);

		// Wait for debounced value to change (300ms) while userDraggedVolumeRef is still true
		await waitFor(
			() => {
				expect(capturedVolume).toEqual({ volume: 70 });
			},
			{ timeout: 2000 },
		);

		// Release drag
		act(() => {
			result.current.setIsDraggingVolume(false);
		});
	});
});
