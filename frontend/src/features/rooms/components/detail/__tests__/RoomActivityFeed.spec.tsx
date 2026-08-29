import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createRoomActivityEntryMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomActivityFeed } from "../RoomActivityFeed";

function respondWithEntries(entries: unknown[]) {
	return HttpResponse.json({
		items: entries,
		page: 1,
		pageSize: 8,
		totalCount: entries.length,
	});
}

describe("RoomActivityFeed Integration Tests", () => {
	it("RoomActivityFeed_NoEntries_ShouldRenderEmptyState", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/events", () => respondWithEntries([])),
		);

		// Act
		renderWithProviders(<RoomActivityFeed roomId="room-01" />);

		// Assert
		expect(
			await screen.findByText("Nenhuma atividade recente."),
		).toBeInTheDocument();
	});

	it("RoomActivityFeed_EntriesReturned_ShouldRenderTitleAndDescription", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/events", () =>
				respondWithEntries([
					createRoomActivityEntryMock({
						title: "Lâmpada Sala ligado",
						description: "Ambiente: Sala de Estar",
					}),
				]),
			),
		);

		// Act
		renderWithProviders(<RoomActivityFeed roomId="room-01" />);

		// Assert
		expect(await screen.findByText("Lâmpada Sala ligado")).toBeInTheDocument();
		expect(screen.getByText("Ambiente: Sala de Estar")).toBeInTheDocument();
	});

	it("RoomActivityFeed_FetchFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/rooms/:id/events", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ title: "Erro Interno do Servidor" },
					{ status: 500 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<RoomActivityFeed roomId="room-01" />);

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar a atividade recente.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(requestCount).toBeGreaterThan(requestsBeforeRetry);
	});
});
