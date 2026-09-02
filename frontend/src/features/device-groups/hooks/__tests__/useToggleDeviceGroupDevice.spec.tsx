import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDeviceGroupMock,
	createDeviceInGroupMock,
} from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import { deviceGroupsKeys } from "../device-groups.keys";
import { useToggleDeviceGroupDevice } from "../useToggleDeviceGroupDevice";

describe("useToggleDeviceGroupDevice Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		// Not createTestQueryClient() here on purpose: its gcTime: 0 garbage
		// collects the seeded cache entry as soon as it has no observer, which
		// is exactly the state assertions below rely on inspecting after the
		// mutation settles.
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

	function seedGroupsCache() {
		const group = createDeviceGroupMock({
			id: "group-1",
			devices: [
				createDeviceInGroupMock({ id: "dev-1", name: "Luz 1", isOn: false }),
				createDeviceInGroupMock({ id: "dev-2", name: "Luz 2", isOn: true }),
			],
		});
		queryClient.setQueryData(deviceGroupsKeys.lists(), [group]);
		return group;
	}

	it("useToggleDeviceGroupDevice_SuccessfulToggle_ShouldOptimisticallyFlipDeviceAndInvalidateRelatedQueries", async () => {
		// Arrange
		seedGroupsCache();
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.post(
				"*/api/devices/:id/toggle",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const { result } = renderHook(() => useToggleDeviceGroupDevice(), {
			wrapper,
		});

		// Act
		result.current.mutate("dev-1");

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const cached = queryClient.getQueryData<
			ReturnType<typeof createDeviceGroupMock>[]
		>(deviceGroupsKeys.lists());
		expect(cached?.[0].devices.find((d) => d.id === "dev-1")?.isOn).toBe(true);
		expect(cached?.[0].devices.find((d) => d.id === "dev-2")?.isOn).toBe(true);

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: deviceGroupsKeys.lists(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["devices", "list"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["dashboard", "rooms"],
		});
	});

	it("useToggleDeviceGroupDevice_ApiFails_ShouldRollbackOnlyTheTargetDeviceAndShowErrorToast", async () => {
		// Arrange
		seedGroupsCache();
		const toastErrorSpy = vi.spyOn(toast, "error");
		server.use(
			http.post("*/api/devices/:id/toggle", () =>
				HttpResponse.json(
					{ title: "Falha ao alternar dispositivo", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useToggleDeviceGroupDevice(), {
			wrapper,
		});

		// Act
		result.current.mutate("dev-1");

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		const cached = queryClient.getQueryData<
			ReturnType<typeof createDeviceGroupMock>[]
		>(deviceGroupsKeys.lists());
		// Rollback restores dev-1 to its original state...
		expect(cached?.[0].devices.find((d) => d.id === "dev-1")?.isOn).toBe(false);
		// ...and dev-2, which was never touched, remains unaffected either way.
		expect(cached?.[0].devices.find((d) => d.id === "dev-2")?.isOn).toBe(true);
		expect(toastErrorSpy).toHaveBeenCalled();
	});
});
