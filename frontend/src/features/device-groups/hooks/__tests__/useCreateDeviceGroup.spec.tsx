import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import type { CreateDeviceGroupPayload } from "../../types/device-groups.types";
import { deviceGroupsKeys } from "../device-groups.keys";
import { useCreateDeviceGroup } from "../useCreateDeviceGroup";

describe("useCreateDeviceGroup Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const validPayload: CreateDeviceGroupPayload = {
		name: "Todas as Luzes",
		icon: "lightbulb",
		deviceIds: ["dev-1", "dev-2"],
	};

	it("useCreateDeviceGroup_SuccessfulMutation_ShouldInvalidateListsAndShowSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.post("*/api/device-groups", () =>
				HttpResponse.json(
					{ message: "Grupo criado com sucesso!", groupId: "group-new-1" },
					{ status: 201 },
				),
			),
		);
		const { result } = renderHook(() => useCreateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate(validPayload);

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: deviceGroupsKeys.lists(),
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith("Grupo criado com sucesso!");
	});

	it("useCreateDeviceGroup_ApiReturns500_ShouldExposeErrorStateAndShowErrorToastWithoutInvalidation", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.post("*/api/device-groups", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useCreateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate(validPayload);

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalled();
	});

	it("useCreateDeviceGroup_ApiReturns422_ShouldExposeValidationErrorProperly", async () => {
		// Arrange
		server.use(
			http.post("*/api/device-groups", () =>
				HttpResponse.json(
					{
						title: "Validation Error",
						status: 422,
						detail: "O nome do grupo é obrigatório.",
					},
					{ status: 422 },
				),
			),
		);
		const { result } = renderHook(() => useCreateDeviceGroup(), { wrapper });

		// Act
		result.current.mutate({ ...validPayload, name: "" });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error?.message).toBe(
			"O nome do grupo é obrigatório.",
		);
		expect(result.current.isSuccess).toBe(false);
	});
});
