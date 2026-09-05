import { HubConnectionState } from "@microsoft/signalr";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getActiveHubConnection,
	setActiveHubConnection,
} from "@/core/lib/signalr";
import { useThrottledHubInvoke } from "../useThrottledHubInvoke";

describe("useThrottledHubInvoke", () => {
	const mockInvoke = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		setActiveHubConnection({
			state: HubConnectionState.Connected,
			invoke: mockInvoke,
		} as never);
	});

	afterEach(() => {
		setActiveHubConnection(null);
		vi.useRealTimers();
	});

	it("RapidCallsWithinWindow_ShouldCoalesceIntoASingleInvokeWithLatestArgs", async () => {
		const { result } = renderHook(() =>
			useThrottledHubInvoke<[string, number]>("PreviewDeviceBrightness", 90),
		);

		// Rajada de 5 chamadas simulando um arraste rápido (~10-20ms entre frames).
		result.current("d-1", 10);
		await vi.advanceTimersByTimeAsync(20);
		result.current("d-1", 20);
		await vi.advanceTimersByTimeAsync(20);
		result.current("d-1", 30);
		await vi.advanceTimersByTimeAsync(20);
		result.current("d-1", 40);
		await vi.advanceTimersByTimeAsync(20);
		result.current("d-1", 50);

		// Ainda dentro da janela de 90ms desde a primeira chamada — nada disparado ainda.
		expect(mockInvoke).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(100);

		expect(mockInvoke).toHaveBeenCalledTimes(1);
		expect(mockInvoke).toHaveBeenCalledWith(
			"PreviewDeviceBrightness",
			"d-1",
			50,
		);
	});

	it("CallsSpacedFartherApartThanTheWindow_ShouldEachDispatchTheirOwnInvoke", async () => {
		const { result } = renderHook(() =>
			useThrottledHubInvoke<[string, number]>("PreviewDeviceBrightness", 90),
		);

		result.current("d-1", 10);
		await vi.advanceTimersByTimeAsync(150);
		result.current("d-1", 20);
		await vi.advanceTimersByTimeAsync(150);

		expect(mockInvoke).toHaveBeenCalledTimes(2);
	});

	it("WhenNoActiveConnection_ShouldNotThrowAndShouldSkipInvoke", async () => {
		setActiveHubConnection(null);
		const { result } = renderHook(() =>
			useThrottledHubInvoke<[string, number]>("PreviewDeviceBrightness", 90),
		);

		result.current("d-1", 10);
		await vi.advanceTimersByTimeAsync(100);

		expect(mockInvoke).not.toHaveBeenCalled();
		expect(getActiveHubConnection()).toBeNull();
	});

	it("WhenConnectionNotYetConnected_ShouldSkipInvoke", async () => {
		setActiveHubConnection({
			state: HubConnectionState.Reconnecting,
			invoke: mockInvoke,
		} as never);
		const { result } = renderHook(() =>
			useThrottledHubInvoke<[string, number]>("PreviewDeviceBrightness", 90),
		);

		result.current("d-1", 10);
		await vi.advanceTimersByTimeAsync(100);

		expect(mockInvoke).not.toHaveBeenCalled();
	});

	it("Unmount_ShouldClearPendingTimeoutAndNeverInvoke", async () => {
		const { result, unmount } = renderHook(() =>
			useThrottledHubInvoke<[string, number]>("PreviewDeviceBrightness", 90),
		);

		result.current("d-1", 10);
		unmount();
		await vi.advanceTimersByTimeAsync(200);

		expect(mockInvoke).not.toHaveBeenCalled();
	});
});
