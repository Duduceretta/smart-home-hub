import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { deviceGroupsKeys } from "../device-groups.keys";
import { useDeleteDeviceGroup } from "../useDeleteDeviceGroup";

describe("useDeleteDeviceGroup Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useDeleteDeviceGroup_SuccessfulMutation_ShouldInvalidateListsAndShowSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete(
				"*/api/device-groups/:id",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const { result } = renderHook(() => useDeleteDeviceGroup(), { wrapper });

		// Act
		result.current.mutate("group-del-1");

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: deviceGroupsKeys.lists(),
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith("Grupo removido com sucesso!");
	});

	it("useDeleteDeviceGroup_ApiReturns500_ShouldExposeErrorStateAndShowErrorToastWithoutInvalidation", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete("*/api/device-groups/:id", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useDeleteDeviceGroup(), { wrapper });

		// Act
		result.current.mutate("group-del-fail");

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalled();
	});
});
