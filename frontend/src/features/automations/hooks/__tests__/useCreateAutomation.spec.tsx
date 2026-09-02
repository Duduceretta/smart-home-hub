import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import type { CreateAutomationPayload } from "../../types/automations.types";
import { automationsKeys } from "../automations.keys";
import { useCreateAutomation } from "../useCreateAutomation";

describe("useCreateAutomation Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const validPayload: CreateAutomationPayload = {
		name: "Ligar luzes ao anoitecer",
		isActive: true,
		rulePayload: JSON.stringify({
			triggers: [{ type: "time", id: "t-1", cronExpression: "0 18 * * *" }],
			conditions: null,
			actions: [{ deviceId: "device-01", desiredState: true }],
		}),
	};

	it("useCreateAutomation_SuccessfulMutation_ShouldInvalidateListsAndCountsAndShowSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.post("*/api/automations", () =>
				HttpResponse.json(
					{
						message: "Automação criada com sucesso!",
						automationId: "new-auto-1",
					},
					{ status: 201 },
				),
			),
		);
		const { result } = renderHook(() => useCreateAutomation(), { wrapper });

		// Act
		result.current.mutate(validPayload);

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
			"Automação criada com sucesso!",
		);
	});

	it("useCreateAutomation_ApiReturns500_ShouldExposeErrorStateAndShowErrorToastWithoutInvalidation", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.post("*/api/automations", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);
		const { result } = renderHook(() => useCreateAutomation(), { wrapper });

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

	it("useCreateAutomation_ApiReturns422_ShouldExposeValidationErrorProperly", async () => {
		// Arrange
		server.use(
			http.post("*/api/automations", () =>
				HttpResponse.json(
					{
						title: "Validation Error",
						status: 422,
						detail: "Nome da automação é obrigatório.",
					},
					{ status: 422 },
				),
			),
		);
		const { result } = renderHook(() => useCreateAutomation(), { wrapper });

		// Act
		result.current.mutate({ ...validPayload, name: "" });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.isSuccess).toBe(false);
	});
});
