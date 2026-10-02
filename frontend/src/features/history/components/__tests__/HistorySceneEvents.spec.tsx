import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryUIStore } from "@/features/history/store/history-ui.store";
import { createHistoryEventMock } from "@/testing/mocks/history.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/testing/test-utils";
import {
	EVENT_SOURCE_ICON,
	EVENT_SOURCE_STYLES,
	EVENT_TYPE_ICON,
} from "../../constants/history.constants";
import { HistoryView } from "../HistoryView";

function renderHistoryView() {
	return renderWithProviders(
		<MemoryRouter>
			<HistoryView />
		</MemoryRouter>,
	);
}

function mockHistory(items: unknown[], onRequest?: (url: URL) => void) {
	server.use(
		http.get("*/api/history", ({ request }) => {
			onRequest?.(new URL(request.url));
			return HttpResponse.json({
				items,
				page: 1,
				pageSize: 20,
				totalCount: items.length,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			});
		}),
		http.get("*/api/history/stats", () =>
			HttpResponse.json({
				totalEvents: 0,
				automationCount: 0,
				alertCount: 0,
				groupActionCount: 0,
			}),
		),
	);
}

const sceneEvent = createHistoryEventMock({
	id: "scene-ev-1",
	eventType: "SceneActivated",
	source: "Scene",
	severity: "Info",
	description: "2 de 2 dispositivos aplicados.",
	deviceId: null,
	deviceName: null,
	roomId: null,
	roomName: null,
	oldValue: null,
	newValue: null,
});

beforeEach(() => {
	useHistoryUIStore.setState({
		searchQuery: "",
		selectedSeverity: "all",
		selectedSource: "all",
		timeframe: "7d",
		customStartDateUtc: null,
		customEndDateUtc: null,
		page: 1,
		pageSize: 20,
		selectedEvent: null,
		expandedEventIds: [],
	});
});

describe("History · eventos de cena", () => {
	it("HistoryConstants_Scene_ShouldHaveItsOwnSourceIconAndStyle", () => {
		expect(EVENT_SOURCE_ICON.Scene).toBeDefined();
		expect(EVENT_SOURCE_ICON.Scene).not.toBe(EVENT_SOURCE_ICON.Default);
		expect(EVENT_SOURCE_STYLES.Scene).toBeDefined();
		expect(EVENT_SOURCE_STYLES.Scene).not.toBe(EVENT_SOURCE_STYLES.System);
	});

	it("HistoryConstants_SceneActivated_ShouldHaveItsOwnEventTypeIcon", () => {
		expect(EVENT_TYPE_ICON.SceneActivated).toBeDefined();
		expect(EVENT_TYPE_ICON.SceneActivated).not.toBe(EVENT_TYPE_ICON.Default);
	});

	it("HistoryConstants_SceneStyle_ShouldUseOnlyDesignTokens", () => {
		const { badge, iconColor } = EVENT_SOURCE_STYLES.Scene ?? {
			badge: "",
			iconColor: "",
		};

		expect(`${badge} ${iconColor}`).not.toMatch(
			/\b(?:bg|text|border)-(?:zinc|indigo|slate|red|rose|white|black)\b/,
		);
	});

	it("HistoryView_SceneEvent_ShouldLabelItsOriginAsCenaInsteadOfTheRawEnumName", async () => {
		mockHistory([sceneEvent]);

		renderHistoryView();

		expect(
			await screen.findByText("2 de 2 dispositivos aplicados."),
		).toBeInTheDocument();
		// "Cena" also exists as an <option> in the source filter; the badge is the <span>.
		expect(screen.getByText("Cena", { selector: "span" })).toBeInTheDocument();
		expect(screen.queryByText("Scene")).not.toBeInTheDocument();
	});

	it("HistoryView_SourceFilter_ShouldOfferCenaAndSendTheSceneSourceToTheApi", async () => {
		const requests: URL[] = [];
		mockHistory([sceneEvent], (url) => requests.push(url));
		const user = userEvent.setup();
		renderHistoryView();
		await screen.findByText("2 de 2 dispositivos aplicados.");

		const select = screen.getByLabelText("Origem");
		expect(
			within(select).getByRole("option", { name: "Cena" }),
		).toBeInTheDocument();

		await user.selectOptions(select, "Scene");

		await waitFor(() =>
			expect(
				requests.some((url) => url.searchParams.get("source") === "Scene"),
			).toBe(true),
		);
		expect(useHistoryUIStore.getState().selectedSource).toBe("Scene");
	});
});
