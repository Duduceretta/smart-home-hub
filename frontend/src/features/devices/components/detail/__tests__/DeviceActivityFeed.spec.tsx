import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceActivityFeed } from "../DeviceActivityFeed";

function respondWithEntries(entries: unknown[]) {
	return HttpResponse.json({
		items: entries,
		page: 1,
		pageSize: 8,
		totalCount: entries.length,
	});
}

describe("DeviceActivityFeed Integration Tests", () => {
	it("DeviceActivityFeed_NoEntries_ShouldRenderEmptyState", async () => {
		// Arrange
		server.use(
			http.get("*/api/devices/:id/events", () => respondWithEntries([])),
		);

		// Act
		renderWithProviders(<DeviceActivityFeed deviceId="device-01" />);

		// Assert
		expect(
			await screen.findByText("Nenhuma atividade recente."),
		).toBeInTheDocument();
	});

	it("DeviceActivityFeed_EntriesReturned_ShouldRenderTitleAndDescription", async () => {
		// Arrange
		server.use(
			http.get("*/api/devices/:id/events", () =>
				respondWithEntries([
					{
						id: "ev-1",
						eventType: "DeviceStatus",
						title: "Lâmpada ligada",
						description: "Ligado manualmente",
						timestamp: "2026-09-06T10:00:00Z",
						isAlert: false,
					},
				]),
			),
		);

		// Act
		renderWithProviders(<DeviceActivityFeed deviceId="device-01" />);

		// Assert
		expect(await screen.findByText("Lâmpada ligada")).toBeInTheDocument();
		expect(screen.getByText("Ligado manualmente")).toBeInTheDocument();
	});

	it("DeviceActivityFeed_FetchFails_ShouldRenderNeutralFallbackAndRetryOnClick", async () => {
		// Arrange — useDeviceActivityLog tem retry:1 explícito: falha 2x
		// (inicial + retry automático interno), sucede só na 3ª (clique manual).
		let requestCount = 0;
		server.use(
			http.get("*/api/devices/:id/events", () => {
				requestCount += 1;
				if (requestCount <= 2) {
					return HttpResponse.json(
						{ title: "Erro Interno do Servidor" },
						{ status: 500 },
					);
				}
				return respondWithEntries([
					{
						id: "ev-1",
						eventType: "DeviceStatus",
						title: "Lâmpada ligada",
						description: "Ligado manualmente",
						timestamp: "2026-09-06T10:00:00Z",
						isAlert: false,
					},
				]);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<DeviceActivityFeed deviceId="device-01" />);

		// Assert — fallback neutro via CardErrorFallback (role="alert")
		const alert = await screen.findByRole("alert", {}, { timeout: 3000 });
		expect(alert).toBeInTheDocument();
		expect(
			screen.getByText("Não foi possível carregar a atividade recente."),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(await screen.findByText("Lâmpada ligada")).toBeInTheDocument();
	});
});
