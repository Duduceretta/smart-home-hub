import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { automationsKeys } from "../automations.keys";
import { useDeleteAutomation } from "../useDeleteAutomation";

describe("useDeleteAutomation Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useDeleteAutomation_SuccessfulMutation_ShouldInvalidateListsAndCountsAndShowSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete(
				"*/api/automations/:id",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const { result } = renderHook(() => useDeleteAutomation(), { wrapper });

		// Act
		result.current.mutate("auto-del-1");

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: automationsKeys.lists(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: automationsKeys.filterCounts(),
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith(
			"Automação removida com sucesso!",
		);
	});

	it("useDeleteAutomation_ApiReturns500_ShouldExposeErrorStateAndShowErrorToastWithoutInvalidation", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete("*/api/automations/:id", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useDeleteAutomation(), { wrapper });

		// Act
		result.current.mutate("auto-del-fail");

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalled();
	});
});
