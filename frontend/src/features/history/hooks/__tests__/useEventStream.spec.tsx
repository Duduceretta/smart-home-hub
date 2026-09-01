import { renderHook, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useHistoryUIStore } from "@/features/history/store/history-ui.store";
import type { GetHistoryParams } from "@/features/history/types/history.types";
import { createHistoryEventMock } from "@/testing/mocks/history.mock";
import { server } from "@/testing/mocks/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { historyKeys } from "../history.keys";
import { useEventStream } from "../useEventStream";

const mockConnection = {
	on: vi.fn(),
	off: vi.fn(),
	onreconnecting: vi.fn(),
	onreconnected: vi.fn(),
	onclose: vi.fn(),
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/core/lib/signalr", () => ({
	createSignalRConnection: () => mockConnection,
}));

function getRegisteredHandler(event: string) {
	const call = mockConnection.on.mock.calls.find(([e]) => e === event);
	return call?.[1] as ((payload?: unknown) => void) | undefined;
}

const mockUser: User = {
	uid: "test-user-uid",
	email: "user@test.com",
	emailVerified: true,
	isAnonymous: false,
	metadata: {},
	providerData: [],
	refreshToken: "",
	tenantId: null,
	delete: vi.fn(),
	getIdToken: vi.fn().mockResolvedValue("mock-token"),
	getIdTokenResult: vi.fn(),
	reload: vi.fn(),
	toJSON: vi.fn(),
	displayName: "Test User",
	phoneNumber: null,
	photoURL: null,
	providerId: "firebase",
};

describe("useEventStream Unit Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: Infinity,
				},
			},
		});
		useAuthStore.setState({ user: mockUser, isLoading: false });
		useHistoryUIStore.setState({
			expandedEventIds: [],
			pendingEvents: { items: [], total: 0, mediaPlaybackCount: 0 },
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const defaultParams: GetHistoryParams = {
		startDateUtc: "2026-08-01T00:00:00.000Z",
		endDateUtc: "2026-08-31T23:59:59.999Z",
		page: 1,
		pageSize: 20,
	};

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useEventStream_OnSignalRTrigger_ShouldDebounceAndFetchNewEvents", async () => {
		// Arrange: Pre-populate cache with initial event
		const initialEvent = createHistoryEventMock({
			id: "ev-initial",
			description: "Evento inicial",
		});
		queryClient.setQueryData(historyKeys.list(defaultParams), {
			items: [initialEvent],
			totalCount: 1,
			page: 1,
			pageSize: 20,
			totalPages: 1,
		});

		const newEvent1 = createHistoryEventMock({
			id: "ev-new-1",
			description: "Novo evento chegado",
			eventType: "StateChange",
		});

		let fetchCalls = 0;
		server.use(
			http.get("*/api/history", () => {
				fetchCalls++;
				return HttpResponse.json({
					items: [newEvent1, initialEvent],
					totalCount: 2,
					page: 1,
					pageSize: 20,
					totalPages: 1,
				});
			}),
		);

		// Act: Mount hook
		renderHook(() => useEventStream(defaultParams), { wrapper });

		// Simulate SignalR triggers in rapid sequence
		const deviceStatusHandler = getRegisteredHandler("DeviceStatusChanged");
		const mediaHandler = getRegisteredHandler("DeviceMediaChanged");
		expect(deviceStatusHandler).toBeDefined();
		expect(mediaHandler).toBeDefined();

		// Burst of 3 triggers within 100ms
		deviceStatusHandler!({ deviceId: "d-1", isOn: true, isOnline: true });
		await vi.advanceTimersByTimeAsync(200);
		mediaHandler!({ deviceId: "d-1", title: "Música 1" });
		await vi.advanceTimersByTimeAsync(200);
		deviceStatusHandler!({ deviceId: "d-1", isOn: false, isOnline: true });

		// Fast forward past debounce window (800ms)
		await vi.advanceTimersByTimeAsync(900);

		// Assert: Fetched only once due to debouncing and coalescing
		await waitFor(() => {
			expect(fetchCalls).toBe(1);
		});
	});

	it("useEventStream_WhenHasExpandedCards_ShouldHoldInPendingBuffer", async () => {
		// Arrange: Mark a card as expanded
		useHistoryUIStore.setState({
			expandedEventIds: ["ev-initial"],
		});

		const initialEvent = createHistoryEventMock({
			id: "ev-initial",
			description: "Evento inicial",
		});
		queryClient.setQueryData(historyKeys.list(defaultParams), {
			items: [initialEvent],
			totalCount: 1,
			page: 1,
			pageSize: 20,
			totalPages: 1,
		});

		const newEventSpotify = createHistoryEventMock({
			id: "ev-spotify",
			description: "Tocando: Song — Artist",
			eventType: "MediaPlayback",
		});
		const newEventState = createHistoryEventMock({
			id: "ev-state",
			description: "Lâmpada ligada",
			eventType: "StateChange",
		});

		server.use(
			http.get("*/api/history", () =>
				HttpResponse.json({
					items: [newEventSpotify, newEventState, initialEvent],
					totalCount: 3,
					page: 1,
					pageSize: 20,
					totalPages: 1,
				}),
			),
		);

		// Act
		renderHook(() => useEventStream(defaultParams), { wrapper });
		const spotifyHandler = getRegisteredHandler("SpotifyPlaybackChanged");
		spotifyHandler!({ title: "Song", isPlaying: true });

		await vi.advanceTimersByTimeAsync(900);

		// Assert: Buffer correctly received items and separated MediaPlayback count
		await waitFor(() => {
			const pending = useHistoryUIStore.getState().pendingEvents;
			expect(pending.total).toBe(2);
			expect(pending.mediaPlaybackCount).toBe(1);
			expect(pending.items.map((i) => i.id)).toEqual([
				"ev-spotify",
				"ev-state",
			]);
		});
	});

	it("useEventStream_WhenAtTopAndNoExpanded_ShouldAutoInsertIntoCache", async () => {
		// Arrange: Scroll at top (default) and no cards expanded
		useHistoryUIStore.setState({
			expandedEventIds: [],
		});

		const initialEvent = createHistoryEventMock({
			id: "ev-initial",
			description: "Evento inicial",
		});
		queryClient.setQueryData(historyKeys.list(defaultParams), {
			items: [initialEvent],
			totalCount: 1,
			page: 1,
			pageSize: 20,
			totalPages: 1,
		});

		const newEvent = createHistoryEventMock({
			id: "ev-auto-inserted",
			description: "Novo evento automático",
			eventType: "StateChange",
		});

		server.use(
			http.get("*/api/history", () =>
				HttpResponse.json({
					items: [newEvent, initialEvent],
					totalCount: 2,
					page: 1,
					pageSize: 20,
					totalPages: 1,
				}),
			),
		);

		// Act
		renderHook(() => useEventStream(defaultParams), { wrapper });
		const autoHandler = getRegisteredHandler("AutomationExecutionResult");
		autoHandler!({
			automationId: "a-1",
			deviceId: "d-1",
			success: true,
			errorMessage: null,
			traceId: "t-1",
		});

		await vi.advanceTimersByTimeAsync(900);

		// Assert: Auto inserted into cache directly and pending buffer remains empty
		await waitFor(() => {
			const cached = queryClient.getQueryData<{
				items: { id: string }[];
				totalCount: number;
			}>(historyKeys.list(defaultParams));
			expect(cached?.items.map((i) => i.id)).toContain("ev-auto-inserted");
			expect(useHistoryUIStore.getState().pendingEvents.total).toBe(0);
		});
	});

	it("useEventStream_WhenOnPageGreaterThanOne_ShouldDiffAgainstPageOneCacheAndHoldInPendingBuffer", async () => {
		// Arrange: User is on Page 6
		const page6Params: GetHistoryParams = {
			...defaultParams,
			page: 6,
		};
		useHistoryUIStore.setState({
			page: 6,
			expandedEventIds: [],
		});

		// Page 1 cache already has events from page 1
		const page1Event = createHistoryEventMock({
			id: "ev-page1-existing",
			description: "Evento topo da página 1",
		});
		queryClient.setQueryData(historyKeys.list(defaultParams), {
			items: [page1Event],
			totalCount: 120,
			page: 1,
			pageSize: 20,
			totalPages: 6,
		});

		// Page 6 has old events
		const page6Event = createHistoryEventMock({
			id: "ev-page6-existing",
			description: "Evento da página 6",
		});
		queryClient.setQueryData(historyKeys.list(page6Params), {
			items: [page6Event],
			totalCount: 120,
			page: 6,
			pageSize: 20,
			totalPages: 6,
		});

		// Real-time API response returns Page 1 with exactly 1 new event
		const brandNewEvent = createHistoryEventMock({
			id: "ev-brand-new-song",
			eventType: "MediaPlayback",
			description: "Tocando: Nova Música",
		});

		server.use(
			http.get("*/api/history", () =>
				HttpResponse.json({
					items: [brandNewEvent, page1Event],
					totalCount: 121,
					page: 1,
					pageSize: 20,
					totalPages: 7,
				}),
			),
		);

		// Act
		renderHook(() => useEventStream(page6Params), { wrapper });
		const spotifyHandler = getRegisteredHandler("SpotifyPlaybackChanged");
		spotifyHandler!({ title: "Nova Música", isPlaying: true });

		await vi.advanceTimersByTimeAsync(900);

		// Assert: Identifies ONLY the 1 new event (not 20!) and buffers it into pendingEvents
		await waitFor(() => {
			const pending = useHistoryUIStore.getState().pendingEvents;
			expect(pending.total).toBe(1);
			expect(pending.mediaPlaybackCount).toBe(1);
			expect(pending.items[0].id).toBe("ev-brand-new-song");
		});
	});
});
