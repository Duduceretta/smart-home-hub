import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@/core/logger/app.logger";
import { server } from "@/testing/mocks/server";
import { roomsKeys } from "../rooms.keys";
import { useAssignDeviceToRoom } from "../useAssignDeviceToRoom";

describe("useAssignDeviceToRoom Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
				mutations: { retry: false },
			},
		});
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const payload = {
		name: "Lâmpada Sala",
		brand: "Philips",
		externalId: "AA:BB",
		type: 1,
		integrationType: 1,
		roomId: "room-02",
	};

	it("useAssignDeviceToRoom_Success_ShouldInvalidatePickerDevicesCache", async () => {
		// Arrange
		server.use(
			http.put(
				"*/api/devices/:id",
				() => new HttpResponse(null, { status: 200 }),
			),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useAssignDeviceToRoom(), { wrapper });

		// Act
		result.current.mutate({ id: "device-01", payload });

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: roomsKeys.pickerDevices(),
		});
	});

	it("useAssignDeviceToRoom_ApiFails500_ShouldLogErrorWithoutInvalidatingCache", async () => {
		// Arrange
		server.use(
			http.put("*/api/devices/:id", () =>
				HttpResponse.json(
					{ title: "Falha ao atribuir dispositivo" },
					{ status: 500 },
				),
			),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const loggerSpy = vi.spyOn(Logger, "error").mockImplementation(() => {});
		const { result } = renderHook(() => useAssignDeviceToRoom(), { wrapper });

		// Act
		result.current.mutate({ id: "device-01", payload });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(loggerSpy).toHaveBeenCalledWith(
			"Falha ao atribuir dispositivo ao ambiente",
			expect.anything(),
		);
		expect(invalidateSpy).not.toHaveBeenCalled();
	});
});
