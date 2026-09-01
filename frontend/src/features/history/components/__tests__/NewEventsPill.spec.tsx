import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryUIStore } from "@/features/history/store/history-ui.store";
import type { GetHistoryParams } from "@/features/history/types/history.types";
import { createHistoryEventMock } from "@/testing/mocks/history.mock";
import {
	createTestQueryClient,
	renderWithProviders,
	screen,
	userEvent,
} from "@/testing/test-utils";
import type React from "react";
import { historyKeys } from "../../hooks/history.keys";
import { NewEventsPill } from "../NewEventsPill";

describe("NewEventsPill Component Tests", () => {
	let queryClient: ReturnType<typeof createTestQueryClient>;

	const defaultParams: GetHistoryParams = {
		startDateUtc: "2026-08-01T00:00:00.000Z",
		endDateUtc: "2026-08-31T23:59:59.999Z",
		page: 1,
		pageSize: 20,
	};

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: Infinity,
				},
			},
		});
		useHistoryUIStore.setState({
			pendingEvents: { items: [], total: 0, mediaPlaybackCount: 0 },
		});
	});

	const renderPill = (containerRef?: React.RefObject<HTMLElement | null>) => {
		return renderWithProviders(
			<NewEventsPill queryParams={defaultParams} containerRef={containerRef} />,
			{ queryClient },
		);
	};

	it("NewEventsPill_WhenPendingBufferEmpty_ShouldReturnNull", () => {
		// Arrange
		useHistoryUIStore.setState({
			pendingEvents: { items: [], total: 0, mediaPlaybackCount: 0 },
		});

		// Act
		const { container } = renderPill();

		// Assert
		expect(container.firstChild).toBeNull();
	});

	it("NewEventsPill_WhenPendingWithoutMedia_ShouldShowStandardCount", () => {
		// Arrange
		const ev1 = createHistoryEventMock({
			id: "p-1",
			eventType: "StateChange",
		});
		const ev2 = createHistoryEventMock({
			id: "p-2",
			eventType: "AutomationTriggered",
		});
		useHistoryUIStore.setState({
			pendingEvents: { items: [ev1, ev2], total: 2, mediaPlaybackCount: 0 },
		});

		// Act
		renderPill();

		// Assert
		expect(screen.getByText("2 novos eventos")).toBeInTheDocument();
	});

	it("NewEventsPill_WhenPendingWithMedia_ShouldShowMediaBreakdown", () => {
		// Arrange
		const ev1 = createHistoryEventMock({
			id: "p-1",
			eventType: "MediaPlayback",
		});
		const ev2 = createHistoryEventMock({
			id: "p-2",
			eventType: "StateChange",
		});
		useHistoryUIStore.setState({
			pendingEvents: { items: [ev1, ev2], total: 2, mediaPlaybackCount: 1 },
		});

		// Act
		renderPill();

		// Assert
		expect(
			screen.getByText("2 novos eventos (incluindo 1 de mídia)"),
		).toBeInTheDocument();
	});

	it("NewEventsPill_OnClick_ShouldMergeIntoCacheAndClearBuffer", async () => {
		// Arrange: Pre-populate cache with initial event
		const initialEvent = createHistoryEventMock({
			id: "p-init",
			description: "Inicial",
		});
		queryClient.setQueryData(historyKeys.list(defaultParams), {
			items: [initialEvent],
			totalCount: 1,
			page: 1,
			pageSize: 20,
			totalPages: 1,
		});

		const newEvent = createHistoryEventMock({
			id: "p-new",
			description: "Chegou agora",
		});
		useHistoryUIStore.setState({
			pendingEvents: { items: [newEvent], total: 1, mediaPlaybackCount: 0 },
		});

		const user = userEvent.setup();

		// Act
		renderPill();
		const pillButton = screen.getByRole("button", {
			name: /1 novo evento/i,
		});
		await user.click(pillButton);

		// Assert: Store buffer cleared
		expect(useHistoryUIStore.getState().pendingEvents.total).toBe(0);

		// Assert: Cache updated
		const cache = queryClient.getQueryData<{
			items: { id: string }[];
			totalCount: number;
		}>(historyKeys.list(defaultParams));
		expect(cache?.items.map((i) => i.id)).toEqual(["p-new", "p-init"]);
		expect(cache?.totalCount).toBe(2);
	});
});
