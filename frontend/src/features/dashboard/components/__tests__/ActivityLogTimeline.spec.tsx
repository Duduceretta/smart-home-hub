import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createActivityLogEntryMock } from "@/testing/mocks/dashboard.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { ActivityLogTimeline } from "../ActivityLogTimeline";

function mockActivityLogResponse(
	items: ReturnType<typeof createActivityLogEntryMock>[],
) {
	return {
		items,
		page: 1,
		pageSize: 5,
		totalCount: items.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

describe("ActivityLogTimeline Integration Tests", () => {
	it("ActivityLogTimeline_NoEntries_ShouldRenderEmptyState", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/activity-log", () =>
				HttpResponse.json(mockActivityLogResponse([])),
			),
		);

		// Act
		renderWithProviders(<ActivityLogTimeline />);

		// Assert
		expect(
			await screen.findByText(/nenhuma atividade recente ainda/i),
		).toBeInTheDocument();
	});

	it("ActivityLogTimeline_EntriesLoaded_ShouldRenderTitleAndDescriptionForEach", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/activity-log", () =>
				HttpResponse.json(
					mockActivityLogResponse([
						createActivityLogEntryMock({
							id: "event-1",
							title: "Lâmpada da Sala ligado",
							description: "Ambiente: Sala de Estar",
						}),
						createActivityLogEntryMock({
							id: "event-2",
							eventType: "Spotify",
							title: "Spotify reproduzindo",
							description: "Song Title — Artist",
						}),
					]),
				),
			),
		);

		// Act
		renderWithProviders(<ActivityLogTimeline />);

		// Assert
		expect(
			await screen.findByText("Lâmpada da Sala ligado"),
		).toBeInTheDocument();
		expect(screen.getByText("Ambiente: Sala de Estar")).toBeInTheDocument();
		expect(screen.getByText("Spotify reproduzindo")).toBeInTheDocument();
		expect(screen.getByText("Song Title — Artist")).toBeInTheDocument();
	});

	it("ActivityLogTimeline_UnknownEventType_ShouldStillRenderWithFallbackStyle", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/activity-log", () =>
				HttpResponse.json(
					mockActivityLogResponse([
						createActivityLogEntryMock({
							// biome-ignore lint/suspicious/noExplicitAny: força um eventType fora do union pra testar o fallback
							eventType: "Security" as any,
							title: "Alarme disparado",
							description: "Movimento detectado",
						}),
					]),
				),
			),
		);

		// Act
		renderWithProviders(<ActivityLogTimeline />);

		// Assert
		expect(await screen.findByText("Alarme disparado")).toBeInTheDocument();
		expect(screen.getByText("Movimento detectado")).toBeInTheDocument();
	});
});
