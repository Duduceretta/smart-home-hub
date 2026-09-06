import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { describe, expect, it } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { DeviceTypeEnum } from "../../types/devices.types";
import { useDeviceCardBrightness } from "../useDeviceCardBrightness";

function createHookWrapper() {
	const queryClient = createTestQueryClient();
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe("useDeviceCardBrightness", () => {
	it("should initialize with device brightness or fallback to 50", () => {
		const deviceWithBrightness = createDeviceMock({
			type: DeviceTypeEnum.Light,
			brightness: 75,
		});

		const { result: r1 } = renderHook(
			() => useDeviceCardBrightness(deviceWithBrightness),
			{ wrapper: createHookWrapper() },
		);
		expect(r1.current.brightness).toBe(75);

		const deviceWithoutBrightness = createDeviceMock({
			type: DeviceTypeEnum.Light,
			brightness: null,
		});

		const { result: r2 } = renderHook(
			() => useDeviceCardBrightness(deviceWithoutBrightness),
			{ wrapper: createHookWrapper() },
		);
		expect(r2.current.brightness).toBe(50);
	});

	it("should update brightness and commit via mutation", async () => {
		let capturedPayload: unknown = null;
		server.use(
			http.put("*/api/devices/:id/brightness", async ({ request }) => {
				capturedPayload = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);

		const device = createDeviceMock({
			id: "light-test-1",
			type: DeviceTypeEnum.Light,
			brightness: 30,
		});

		const { result } = renderHook(() => useDeviceCardBrightness(device), {
			wrapper: createHookWrapper(),
		});

		act(() => {
			result.current.setBrightness(80);
			result.current.setIsDraggingBrightness(true);
		});

		expect(result.current.brightness).toBe(80);
		expect(result.current.isDraggingBrightness).toBe(true);

		act(() => {
			result.current.setIsDraggingBrightness(false);
			result.current.commitBrightness(80);
		});

		await waitFor(() => {
			expect(capturedPayload).toEqual({ brightnessPercent: 80 });
		});
	});
});
