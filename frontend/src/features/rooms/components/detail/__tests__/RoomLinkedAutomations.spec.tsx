import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createRoomLinkedAutomationMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomLinkedAutomations } from "../RoomLinkedAutomations";

function renderComponent(roomId = "room-01") {
	return renderWithProviders(
		<MemoryRouter>
			<RoomLinkedAutomations roomId={roomId} />
		</MemoryRouter>,
	);
}

describe("RoomLinkedAutomations Integration Tests", () => {
	it("RoomLinkedAutomations_NoAutomations_ShouldRenderEmptyStateWithCreateLink", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/automations", () => HttpResponse.json([])),
		);

		// Act
		renderComponent();

		// Assert
		expect(
			await screen.findByText(
				"Nenhuma automação configurada para este ambiente.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar automação" }),
		).toBeInTheDocument();
	});

	it("RoomLinkedAutomations_ActiveAutomation_ShouldRenderNameAndActiveBadge", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/automations", () =>
				HttpResponse.json([
					createRoomLinkedAutomationMock({
						name: "Ligar luzes ao anoitecer",
						isActive: true,
						triggerKind: "schedule",
					}),
				]),
			),
		);

		// Act
		renderComponent();

		// Assert
		expect(
			await screen.findByText("Ligar luzes ao anoitecer"),
		).toBeInTheDocument();
		expect(screen.getByText("Ativa")).toBeInTheDocument();
		expect(screen.getByText("Gatilho por horário")).toBeInTheDocument();
	});

	it("RoomLinkedAutomations_InactiveAutomation_ShouldRenderInactiveBadge", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/automations", () =>
				HttpResponse.json([
					createRoomLinkedAutomationMock({ isActive: false }),
				]),
			),
		);

		// Act
		renderComponent();

		// Assert
		expect(await screen.findByText("Inativa")).toBeInTheDocument();
	});

	it("RoomLinkedAutomations_FetchFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/rooms/:id/automations", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ title: "Erro Interno do Servidor" },
					{ status: 500 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderComponent();

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar as automações.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(requestCount).toBeGreaterThan(requestsBeforeRetry);
	});

	it("RoomLinkedAutomations_BackgroundRefetchFailsWithCache_ShouldKeepListAndShowStaleIndicator", async () => {
		// Arrange — 1ª carga bem-sucedida, popula o cache
		server.use(
			http.get("*/api/rooms/:id/automations", () =>
				HttpResponse.json([
					createRoomLinkedAutomationMock({ name: "Ligar luzes ao anoitecer" }),
				]),
			),
		);
		const { queryClient } = renderComponent();
		await screen.findByText("Ligar luzes ao anoitecer");

		// Act — refetch em background falha
		server.use(
			http.get("*/api/rooms/:id/automations", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);
		await queryClient.refetchQueries();

		// Assert — lista continua na tela, com indicador discreto no título
		expect(
			await screen.findByTitle(/dados desatualizados/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(screen.getByText("Ligar luzes ao anoitecer")).toBeInTheDocument();
	});
});
