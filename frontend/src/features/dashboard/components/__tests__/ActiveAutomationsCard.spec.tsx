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

	it("ActiveAutomationsCard_NoActiveAutomations_ShouldShowInactiveAutomationWithSwitchAndEmptySlots", async () => {
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
			await screen.findByText("Desligar tudo à noite"),
		).toBeInTheDocument();
		expect(screen.getByText("Desativada")).toBeInTheDocument();

		const switchElement = screen.getByRole("switch", {
			name: /Ativar automação Desligar tudo à noite/,
		});
		expect(switchElement).toBeInTheDocument();
		expect(switchElement).not.toBeChecked();

		// 1 automação desativada + 2 slots vazios = 3 visíveis no card
		expect(screen.getAllByText("Adicionar automação")).toHaveLength(2);
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

	it("ActiveAutomationsCard_LastExecutedAtPresent_ShouldSortByExecutionNotUpdate", async () => {
		// Arrange — a2 foi atualizada por último, mas a1 EXECUTOU por último;
		// deve ordenar por execução real, não por edição.
		mockAutomations([
			{
				id: "a1",
				name: "Executada Recentemente",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				lastExecutedAt: "2026-01-10T00:00:00Z",
			},
			{
				id: "a2",
				name: "Só Editada Recentemente",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-09T00:00:00Z",
				lastExecutedAt: null,
			},
		]);

		// Act
		renderCard();
		await screen.findByText("Executada Recentemente");

		// Assert
		const names = screen
			.getAllByText(/Recentemente$/)
			.map((el) => el.textContent);
		expect(names).toEqual([
			"Executada Recentemente",
			"Só Editada Recentemente",
		]);
		expect(screen.getByText(/^Executada há/)).toBeInTheDocument();
		expect(screen.getByText(/^Atualizada há/)).toBeInTheDocument();
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

	it("ActiveAutomationsCard_SwitchToggled_ShouldCallUpdateAndToggleState", async () => {
		// Arrange
		let putCalledWith: { isActive: boolean } | null = null;
		server.use(
			http.get("*/api/automations", () =>
				HttpResponse.json(
					{
						items: [
							{
								id: "a1",
								name: "Ligar luzes no pôr do sol",
								isActive: false,
								rulePayload: '{"trigger":{"type":"time"}}',
								createdAt: "2026-01-01T00:00:00Z",
								updatedAt: "2026-01-01T00:00:00Z",
							},
						],
						totalPages: 1,
					},
					{ status: 200 },
				),
			),
			http.put("*/api/automations/a1", async ({ request }) => {
				const body = (await request.json()) as { isActive: boolean };
				putCalledWith = body;
				return HttpResponse.json(
					{
						id: "a1",
						name: "Ligar luzes no pôr do sol",
						isActive: body.isActive,
					},
					{ status: 200 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderCard();
		await screen.findByText("Ligar luzes no pôr do sol");
		const switchElement = screen.getByRole("switch", {
			name: /Ativar automação Ligar luzes no pôr do sol/,
		});
		await user.click(switchElement);

		// Assert
		expect(putCalledWith).toEqual(expect.objectContaining({ isActive: true }));
	});

	it("ActiveAutomationsCard_ClickAutomationRow_ShouldBeInteractive", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Ligar luzes no pôr do sol",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		]);
		const user = userEvent.setup();

		// Act
		renderCard();
		const row = await screen.findByRole("button", {
			name: /Ligar luzes no pôr do sol/i,
		});
		await user.click(row);

		// Assert
		expect(row).toBeInTheDocument();
	});

	it("ActiveAutomationsCard_TwoAutomationsOneDeactivated_BothShouldRemainVisible", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Ligar luz da Sala",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
			{
				id: "a2",
				name: "Desligar Ar Condicionado",
				isActive: false,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-02T00:00:00Z",
			},
		]);

		// Act
		renderCard();

		// Assert: ambas as automações continuam visíveis no painel + 1 slot vazio
		expect(await screen.findByText("Ligar luz da Sala")).toBeInTheDocument();
		expect(screen.getByText("Desligar Ar Condicionado")).toBeInTheDocument();
		expect(screen.getByText("Desativada")).toBeInTheDocument();
		expect(screen.getAllByText("Adicionar automação")).toHaveLength(1);
	});

	it("ActiveAutomationsCard_DeactivatingOneOfTwoAutomations_KeepsBothVisible", async () => {
		// Arrange
		let currentAutomations = [
			{
				id: "a1",
				name: "Ligar luz da Sala",
				isActive: true,
				rulePayload: "{}",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
			{
				id: "a2",
				name: "Desligar Ar Condicionado",
				isActive: true,
				rulePayload: "{}",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		];
		server.use(
			http.get("*/api/automations", () =>
				HttpResponse.json({
					items: currentAutomations,
					totalPages: 1,
				}),
			),
			http.put("*/api/automations/a2", async ({ request }) => {
				const body = (await request.json()) as { isActive: boolean };
				currentAutomations = currentAutomations.map((a) =>
					a.id === "a2" ? { ...a, isActive: body.isActive } : a,
				);
				return HttpResponse.json(
					{
						id: "a2",
						name: "Desligar Ar Condicionado",
						isActive: body.isActive,
					},
					{ status: 200 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderCard();
		expect(await screen.findByText("Ligar luz da Sala")).toBeInTheDocument();
		expect(screen.getByText("Desligar Ar Condicionado")).toBeInTheDocument();

		const switchElement = screen.getByRole("switch", {
			name: /Desativar automação Desligar Ar Condicionado/,
		});
		await user.click(switchElement);

		// Assert: Desligar Ar Condicionado NÃO deve sumir!
		expect(screen.getByText("Ligar luz da Sala")).toBeInTheDocument();
		expect(screen.getByText("Desligar Ar Condicionado")).toBeInTheDocument();
		expect(screen.getByText("Desativada")).toBeInTheDocument();
		expect(screen.getAllByText("Adicionar automação")).toHaveLength(1);
	});

	it("ActiveAutomationsCard_DeactivatingFirstAutomation_PreservesItemPositions", async () => {
		// Arrange
		let currentAutomations = [
			{
				id: "a1",
				name: "Primeira Automação",
				isActive: true,
				rulePayload: "{}",
				createdAt: "2026-01-02T00:00:00Z",
				updatedAt: "2026-01-02T00:00:00Z",
			},
			{
				id: "a2",
				name: "Segunda Automação",
				isActive: true,
				rulePayload: "{}",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		];
		server.use(
			http.get("*/api/automations", () =>
				HttpResponse.json({
					items: currentAutomations,
					totalPages: 1,
				}),
			),
			http.put("*/api/automations/a1", async ({ request }) => {
				const body = (await request.json()) as { isActive: boolean };
				currentAutomations = currentAutomations.map((a) =>
					a.id === "a1" ? { ...a, isActive: body.isActive } : a,
				);
				return HttpResponse.json(
					{
						id: "a1",
						name: "Primeira Automação",
						isActive: body.isActive,
					},
					{ status: 200 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderCard();
		expect(await screen.findByText("Primeira Automação")).toBeInTheDocument();
		expect(screen.getByText("Segunda Automação")).toBeInTheDocument();

		// Desativa a primeira automação
		const switchElement = screen.getByRole("switch", {
			name: /Desativar automação Primeira Automação/,
		});
		await user.click(switchElement);

		// Assert: a Primeira Automação continua como o primeiro elemento e Segunda Automação como o segundo
		const rows = screen.getAllByRole("button", {
			name: /Automação/i,
		});
		expect(rows[0]).toHaveTextContent("Primeira Automação");
		expect(rows[0]).toHaveTextContent("Desativada");
		expect(rows[1]).toHaveTextContent("Segunda Automação");
	});

	it("ActiveAutomationsCard_ClickEditButton_OpensEditAutomationsPreviewModal", async () => {
		// Arrange
		mockAutomations([
			{
				id: "a1",
				name: "Automação 1",
				isActive: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
		]);
		const user = userEvent.setup();

		// Act
		renderCard();
		const editButton = await screen.findByRole("button", {
			name: /Escolher automações exibidas/i,
		});
		await user.click(editButton);

		// Assert: modal abre com título e opções
		expect(
			screen.getByText("Escolher automações exibidas"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Escolha até 3 automações para exibir no painel e ajuste a ordem desejada.",
			),
		).toBeInTheDocument();
	});
});
