import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createSceneDeviceMock,
	createSceneMock,
	createSceneStatsMock,
} from "@/testing/mocks/scenes.mock";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { useScene } from "../useScene";
import { useSceneDevices } from "../useSceneDevices";
import { useSceneRooms } from "../useSceneRooms";
import { useSceneStats } from "../useSceneStats";
import { useScenes } from "../useScenes";

describe("scene read hooks", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const page = (items: unknown[], overrides = {}) => ({
		items,
		page: 1,
		pageSize: 10,
		totalCount: items.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
		...overrides,
	});

	it("useScenes_ApiReturnsAPage_ShouldExposeItemsAndTotals", async () => {
		const scenes = [
			createSceneMock(),
			createSceneMock({ id: "scene-2", name: "Boa Noite" }),
		];
		server.use(
			http.get("*/api/scenes", () =>
				HttpResponse.json(page(scenes, { totalCount: 27, totalPages: 3 })),
			),
		);

		const { result } = renderHook(() => useScenes({ page: 1, pageSize: 10 }), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.items).toEqual(scenes);
		expect(result.current.data?.totalCount).toBe(27);
	});

	it("useScenes_FiltersChange_ShouldRequestAgainWithThem", async () => {
		const requests: string[] = [];
		server.use(
			http.get("*/api/scenes", ({ request }) => {
				requests.push(new URL(request.url).search);
				return HttpResponse.json(page([]));
			}),
		);

		const { result, rerender } = renderHook(
			({ search }: { search: string }) =>
				useScenes({ page: 1, pageSize: 10, search, room: "Sala" }),
			{ wrapper, initialProps: { search: "" } },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		rerender({ search: "luz" });
		await waitFor(() => expect(requests).toHaveLength(2));

		expect(requests[1]).toContain("search=luz");
		expect(requests[1]).toContain("room=Sala");
	});

	it("useScenes_NextPageLoading_ShouldKeepThePreviousPageOnScreen", async () => {
		const first = createSceneMock({ id: "p1", name: "Primeira" });
		const second = createSceneMock({ id: "p2", name: "Segunda" });
		server.use(
			http.get("*/api/scenes", async ({ request }) => {
				const requested = new URL(request.url).searchParams.get("page");
				if (requested === "2") {
					await new Promise((resolve) => setTimeout(resolve, 50));
					return HttpResponse.json(page([second], { page: 2 }));
				}
				return HttpResponse.json(page([first]));
			}),
		);

		const { result, rerender } = renderHook(
			({ pageNumber }: { pageNumber: number }) =>
				useScenes({ page: pageNumber, pageSize: 10 }),
			{ wrapper, initialProps: { pageNumber: 1 } },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		rerender({ pageNumber: 2 });

		expect(result.current.data?.items[0]?.name).toBe("Primeira");
		expect(result.current.isPlaceholderData).toBe(true);
		await waitFor(() =>
			expect(result.current.data?.items[0]?.name).toBe("Segunda"),
		);
	});

	it("useScenes_ApiFails_ShouldExposeErrorState", async () => {
		server.use(
			http.get("*/api/scenes", () =>
				HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
			),
		);

		const { result } = renderHook(() => useScenes({ page: 1, pageSize: 10 }), {
			wrapper,
		});

		// O hook usa `retry: 1` (padrão do repo): a falha só aparece após a 2ª tentativa.
		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 4000,
		});
	});

	it("useSceneRooms_ApiReturnsNames_ShouldExposeThem", async () => {
		server.use(
			http.get("*/api/scenes/rooms", () =>
				HttpResponse.json(["Quarto", "Sala"]),
			),
		);

		const { result } = renderHook(() => useSceneRooms(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(["Quarto", "Sala"]);
	});

	it("useSceneStats_ApiReturnsStats_ShouldExposeThemAndSendTheBrowserTimeZone", async () => {
		const stats = createSceneStatsMock({ activationsTotal: 9 });
		let receivedTimeZone: string | null = null;
		server.use(
			http.get("*/api/scenes/stats", ({ request }) => {
				receivedTimeZone = new URL(request.url).searchParams.get("timeZone");
				return HttpResponse.json(stats);
			}),
		);

		const { result } = renderHook(() => useSceneStats(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(stats);
		expect(receivedTimeZone).toBe(
			Intl.DateTimeFormat().resolvedOptions().timeZone,
		);
	});

	it("useSceneStats_ApiFails_ShouldExposeErrorState", async () => {
		server.use(
			http.get("*/api/scenes/stats", () =>
				HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
			),
		);

		const { result } = renderHook(() => useSceneStats(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 4000,
		});
	});

	it("useScene_WithoutId_ShouldNotRequestAnything", async () => {
		let requested = false;
		server.use(
			http.get("*/api/scenes/:id", () => {
				requested = true;
				return HttpResponse.json(createSceneMock());
			}),
		);

		const { result } = renderHook(() => useScene(null), { wrapper });

		expect(result.current.fetchStatus).toBe("idle");
		expect(requested).toBe(false);
	});

	it("useScene_WithId_ShouldExposeTheScene", async () => {
		const scene = createSceneMock({ id: "scene-7", name: "Leitura" });
		server.use(
			http.get("*/api/scenes/scene-7", () => HttpResponse.json(scene)),
		);

		const { result } = renderHook(() => useScene("scene-7"), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(scene);
	});

	it("useScene_UnknownId_ShouldExposeErrorWithoutRetrying", async () => {
		let calls = 0;
		server.use(
			http.get("*/api/scenes/gone", () => {
				calls += 1;
				return HttpResponse.json(
					{ title: "Not found", status: 404 },
					{ status: 404 },
				);
			}),
		);

		const { result } = renderHook(() => useScene("gone"), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(calls).toBe(1);
	});

	it("useSceneDevices_MixedDevices_ShouldKeepOnlyTheOnesASceneCanControl", async () => {
		const light = createSceneDeviceMock({ id: "light", type: 1 });
		const plug = createSceneDeviceMock({ id: "plug", type: 2 });
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({
					items: [
						light,
						createSceneDeviceMock({ id: "sensor", type: 3 }),
						createSceneDeviceMock({ id: "camera", type: 5 }),
						createSceneDeviceMock({ id: "lock", type: 6 }),
						createSceneDeviceMock({ id: "alarm", type: 7 }),
						plug,
					],
				}),
			),
		);

		const { result } = renderHook(() => useSceneDevices(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.map((device) => device.id)).toEqual([
			"light",
			"plug",
		]);
	});
});
