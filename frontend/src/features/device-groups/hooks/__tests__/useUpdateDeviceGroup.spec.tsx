import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import type { UpdateDeviceGroupPayload } from "../../types/device-groups.types";
import { deviceGroupsKeys } from "../device-groups.keys";
import { useUpdateDeviceGroup } from "../useUpdateDeviceGroup";

describe("useUpdateDeviceGroup Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const validPayload: UpdateDeviceGroupPayload = {
		name: "Todas as Luzes (atualizado)",
		icon: "lightbulb",
		deviceIds: ["dev-1", "dev-3"],
	};

	it("useUpdateDeviceGroup_SuccessfulMutation_ShouldInvalidateListsAndDetailAndShowSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.put("*/api/device-groups/:id", () =>
				HttpResponse.json(
					{
						id: "group-123",
						name: validPayload.name,
						icon: validPayload.icon,
						deviceIds: validPayload.deviceIds,
					},
					{ status: 200 },
				),
			),
		);
		const { result } = renderHook(() => useUpdateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate({ id: "group-123", payload: validPayload });

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: deviceGroupsKeys.lists(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: deviceGroupsKeys.detail("group-123"),
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith(
			"Grupo atualizado com sucesso!",
		);
	});

	it("useUpdateDeviceGroup_ApiReturns500_ShouldExposeErrorStateAndShowErrorToastWithoutInvalidation", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.put("*/api/device-groups/:id", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useUpdateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate({ id: "group-123", payload: validPayload });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalled();
	});

	it("useUpdateDeviceGroup_ApiReturns422_ShouldExposeValidationErrorProperly", async () => {
		// Arrange
		server.use(
			http.put("*/api/device-groups/:id", () =>
				HttpResponse.json(
					{
						title: "Validation Error",
						status: 422,
						detail: "Selecione pelo menos um dispositivo para o grupo.",
					},
					{ status: 422 },
				),
			),
		);
		const { result } = renderHook(() => useUpdateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate({
			id: "group-123",
			payload: { ...validPayload, deviceIds: [] },
		});

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error?.message).toBe(
			"Selecione pelo menos um dispositivo para o grupo.",
		);
		expect(result.current.isSuccess).toBe(false);
	});
});
