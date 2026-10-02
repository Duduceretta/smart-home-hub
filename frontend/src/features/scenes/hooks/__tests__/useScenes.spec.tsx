import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createSceneDeviceMock,
	createSceneMock,
} from "@/testing/mocks/scenes.mock";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import { useSceneDevices } from "../useSceneDevices";
import { useScenes } from "../useScenes";

describe("scene read hooks", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useScenes_ApiReturnsScenes_ShouldExposeThem", async () => {
		const scenes = [
			createSceneMock(),
			createSceneMock({ id: "scene-2", name: "Boa Noite" }),
		];
		server.use(
			http.get("*/api/scenes", () => HttpResponse.json({ items: scenes })),
		);

		const { result } = renderHook(() => useScenes(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(scenes);
	});

	it("useScenes_ApiFails_ShouldExposeErrorState", async () => {
		server.use(
			http.get("*/api/scenes", () =>
				HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
			),
		);

		const { result } = renderHook(() => useScenes(), { wrapper });

		// O hook usa `retry: 1` (padrão do repo): a falha só aparece após a 2ª tentativa.
		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 4000,
		});
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
