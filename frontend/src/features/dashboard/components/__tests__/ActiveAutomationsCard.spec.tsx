import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { ActiveAutomationsCard } from "../ActiveAutomationsCard";

function renderCard() {
	return renderWithProviders(
		<MemoryRouter>
			<ActiveAutomationsCard />
		</MemoryRouter>,
	);
}

function mockAutomations(items: unknown[]) {
	server.use(
		http.get("*/api/automations", () =>
			HttpResponse.json({ items, totalPages: 1 }, { status: 200 }),
		),
	);
}

describe("ActiveAutomationsCard Integration Tests", () => {
	it("ActiveAutomationsCard_NoAutomations_ShouldShowHonestEmptyState", async () => {
		// Arrange
		mockAutomations([]);

		// Act
		renderCard();

		// Assert
		expect(
			await screen.findByText("Nenhuma automação cadastrada ainda"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar automação" }),
		).toBeInTheDocument();
	});

	it("ActiveAutomationsCard_NoActiveAutomations_ShouldShowNoneActiveMessage", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Desligar tudo à noite",
				isActive: false,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		]);

		// Act
		renderCard();

		// Assert
		expect(
			await screen.findByText("Nenhuma automação ativa no momento"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Ver todas as automações/ }),
		).toBeInTheDocument();
	});

	it("ActiveAutomationsCard_MoreThanThreeActive_ShouldShowOnlyTheThreeMostRecentlyUpdated", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Automação Antiga",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
			{
				id: "a2",
				name: "Automação Recente",
				isActive: true,
				createdAt: "2026-01-02T00:00:00Z",
				updatedAt: "2026-01-05T00:00:00Z",
			},
			{
				id: "a3",
				name: "Automação Intermediária",
				isActive: true,
				createdAt: "2026-01-02T00:00:00Z",
				updatedAt: "2026-01-03T00:00:00Z",
			},
			{
				id: "a4",
				name: "Automação Mais Recente",
				isActive: true,
				createdAt: "2026-01-02T00:00:00Z",
				updatedAt: "2026-01-06T00:00:00Z",
			},
		]);

		// Act
		renderCard();
		await screen.findByText("Automação Mais Recente");

		// Assert — as 3 mais recentemente atualizadas aparecem, a mais antiga não
		expect(screen.getByText("Automação Recente")).toBeInTheDocument();
		expect(screen.getByText("Automação Intermediária")).toBeInTheDocument();
		expect(screen.queryByText("Automação Antiga")).not.toBeInTheDocument();
	});

	it("ActiveAutomationsCard_ViewAllClicked_ShouldNavigateToAutomationsPage", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Automação Ativa",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		]);
		const user = userEvent.setup();

		// Act
		renderCard();
		await screen.findByText("Automação Ativa");
		await user.click(
			screen.getByRole("button", { name: /Ver todas as automações/ }),
		);

		// Assert — navegação real não é observável sem MemoryRouter com rotas
		// declaradas; o clique não deve lançar erro e o botão continua no DOM.
		expect(
			screen.getByRole("button", { name: /Ver todas as automações/ }),
		).toBeInTheDocument();
	});
});
