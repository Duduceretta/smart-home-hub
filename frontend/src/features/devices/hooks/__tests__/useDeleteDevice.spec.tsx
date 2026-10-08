import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCENES_QUERY_ROOT } from "@/core/constants/query-key-roots";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { devicesKeys } from "../devices.keys";
import { useDeleteDevice } from "../useDeleteDevice";

describe("useDeleteDevice", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useDeleteDevice_Success_ShouldInvalidateDeviceListsAndToastSuccess", async () => {
		const toastSuccess = vi.spyOn(toast, "success");
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete(
				"*/api/devices/:id",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const { result } = renderHook(() => useDeleteDevice(), { wrapper });

		result.current.mutate("dev-1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: devicesKeys.lists(),
		});
		expect(toastSuccess).toHaveBeenCalledWith(
			"Dispositivo removido com sucesso!",
		);
	});

	it("useDeleteDevice_Success_ShouldAlsoInvalidateScenesBecauseTheApiRemovesTheirItems", async () => {
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete(
				"*/api/devices/:id",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const { result } = renderHook(() => useDeleteDevice(), { wrapper });

		result.current.mutate("dev-1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: SCENES_QUERY_ROOT });
	});

	it("useDeleteDevice_ApiFails_ShouldToastErrorAndKeepCachesUntouched", async () => {
		const toastError = vi.spyOn(toast, "error");
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete("*/api/devices/:id", () =>
				HttpResponse.json(
					{ title: "Device.NotFound", status: 404, detail: "Não encontrado." },
					{ status: 404 },
				),
			),
		);
		const { result } = renderHook(() => useDeleteDevice(), { wrapper });

		result.current.mutate("dev-1");

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(toastError).toHaveBeenCalledWith("Não encontrado.");
		expect(invalidate).not.toHaveBeenCalled();
	});
});
