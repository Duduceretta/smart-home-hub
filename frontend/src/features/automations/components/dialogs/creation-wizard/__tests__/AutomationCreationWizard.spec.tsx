import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAutomationsUIStore } from "@/features/automations/store/automations-ui.store";
import type { CreateAutomationPayload } from "@/features/automations/types/automations.types";
import {
	createAutomationFilterCountsMock,
	createPickerDeviceMock,
} from "@/testing/mocks/automations.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { AutomationCreationWizard } from "../AutomationCreationWizard";

const mockDevice1 = createPickerDeviceMock({
	id: "dev-lamp-01",
	name: "Lâmpada Quarto",
	brand: "Philips",
	isOn: false,
});

const mockDevice2 = createPickerDeviceMock({
	id: "dev-sensor-01",
	name: "Sensor de Temperatura",
	brand: "Aqara",
	isOn: true,
});

const mockDevice3 = createPickerDeviceMock({
	id: "dev-ac-01",
	name: "Ar Condicionado",
	brand: "LG",
	isOn: false,
});

function setupMswHandlers() {
	server.use(
		http.get("*/api/devices", () => {
			return HttpResponse.json([mockDevice1, mockDevice2, mockDevice3], {
				status: 200,
			});
		}),
		http.get("*/api/automations/counts", () => {
			return HttpResponse.json(createAutomationFilterCountsMock(), {
				status: 200,
			});
		}),
	);
}

describe("AutomationCreationWizard Integration Tests", {
	timeout: 15000,
}, () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useAutomationsUIStore.setState({
			isCreateWizardOpen: false,
			editingAutomation: null,
			selectedId: null,
		});
		setupMswHandlers();
	});

	it("AutomationCreationWizard_CompleteScheduleJourney_ShouldSubmitPayloadAndCloseModal", async () => {
		// Arrange
		let capturedPayload: CreateAutomationPayload | null = null;
		server.use(
			http.post("*/api/automations", async ({ request }) => {
				capturedPayload = (await request.json()) as CreateAutomationPayload;
				return HttpResponse.json(
					{
						message: "Automação criada com sucesso!",
						automationId: "auto-schedule-1",
					},
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Act - Step 1: Origem do Gatilho
		expect(
			await screen.findByRole("heading", { name: "Qual a origem do gatilho?" }),
		).toBeInTheDocument();

		const nextButtonStep1 = screen.getByRole("button", { name: "Próximo" });
		expect(nextButtonStep1).toBeDisabled();

		await user.click(screen.getByRole("button", { name: /Horário/i }));
		expect(nextButtonStep1).toBeEnabled();
		await user.click(nextButtonStep1);

		// Act - Step 2: Configuração do Horário
		expect(
			await screen.findByRole("heading", { name: "Configure o horário" }),
		).toBeInTheDocument();

		const nextButtonStep2 = screen.getByRole("button", { name: "Próximo" });
		expect(nextButtonStep2).toBeDisabled();

		const timeInput = screen.getByLabelText("Horário");
		await user.type(timeInput, "06:30");
		await user.click(screen.getByTitle("Domingo")); // Desmarca domingo

		expect(nextButtonStep2).toBeEnabled();
		await user.click(nextButtonStep2);

		// Act - Step 3: Ações
		expect(
			await screen.findByRole("heading", { name: "O que deve acontecer?" }),
		).toBeInTheDocument();

		const nextButtonStep3 = screen.getByRole("button", { name: "Próximo" });
		expect(nextButtonStep3).toBeDisabled();

		await user.click(screen.getByRole("button", { name: /Adicionar Ação/i }));

		const deviceSelectTrigger = screen.getByRole("combobox");
		await user.click(deviceSelectTrigger);
		const deviceOption = await screen.findByRole("option", {
			name: "Lâmpada Quarto",
		});
		await user.click(deviceOption);

		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(await screen.findByText("Ligar Lâmpada Quarto")).toBeInTheDocument();
		expect(nextButtonStep3).toBeEnabled();
		await user.click(nextButtonStep3);

		// Act - Step 4: Revisão e Salvamento
		expect(
			await screen.findByRole("heading", { name: "Tudo pronto?" }),
		).toBeInTheDocument();

		const saveButton = screen.getByRole("button", { name: "Salvar Automação" });
		expect(saveButton).toBeDisabled();

		const nameInput = screen.getByLabelText("Nome da automação");
		await user.type(nameInput, "Rotina Matinal");
		expect(saveButton).toBeEnabled();

		await user.click(saveButton);

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		expect(capturedPayload).toMatchObject({
			name: "Rotina Matinal",
			isActive: true,
		});

		const parsedRule = JSON.parse(
			(capturedPayload as unknown as CreateAutomationPayload).rulePayload,
		);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "time",
			cronExpression: "30 6 * * 1,2,3,4,5,6",
		});
		expect(parsedRule.conditions).toBeNull();
		expect(parsedRule.actions).toEqual([
			{ deviceId: "dev-lamp-01", desiredState: true },
		]);

		await waitFor(() => {
			expect(useAutomationsUIStore.getState().isCreateWizardOpen).toBe(false);
		});
	});

	it("AutomationCreationWizard_CompleteSensorJourney_ShouldSubmitSensorTriggerWithConditions", async () => {
		// Arrange
		let capturedPayload: CreateAutomationPayload | null = null;
		server.use(
			http.post("*/api/automations", async ({ request }) => {
				capturedPayload = (await request.json()) as CreateAutomationPayload;
				return HttpResponse.json(
					{
						message: "Automação criada com sucesso!",
						automationId: "auto-sensor-1",
					},
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Act - Step 1: Selecionar Sensor
		await user.click(await screen.findByRole("button", { name: /Sensor/i }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 2: Configurar Sensor
		expect(
			await screen.findByRole("heading", { name: "Configure o sensor" }),
		).toBeInTheDocument();

		// Seleciona o dispositivo do sensor e a condição
		const [deviceCombobox, , conditionCombobox] =
			screen.getAllByRole("combobox");
		await user.click(deviceCombobox);
		await user.click(
			await screen.findByRole("option", { name: "Sensor de Temperatura" }),
		);

		await user.click(conditionCombobox);
		await user.click(
			await screen.findByRole("option", { name: "maior ou igual a" }),
		);

		// Preenche valor
		const valueInput = screen.getByLabelText("Valor");
		await user.type(valueInput, "28");

		// Verifica preview
		expect(
			screen.getByText(/Quando Sensor de Temperatura tiver temperatura/i),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 3: Adicionar Ação (Ligar Ar Condicionado)
		await user.click(
			await screen.findByRole("button", { name: /Adicionar Ação/i }),
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Ar Condicionado" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 4: Salvar
		const nameInput = await screen.findByLabelText("Nome da automação");
		await user.type(nameInput, "Resfriamento Automático");
		await user.click(screen.getByRole("button", { name: "Salvar Automação" }));

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		const parsedRule = JSON.parse(
			(capturedPayload as unknown as CreateAutomationPayload).rulePayload,
		);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "device_state",
			deviceId: "dev-sensor-01",
			stateType: "temperature",
		});
		expect(parsedRule.conditions).toEqual({
			operator: "AND",
			rules: [
				{
					deviceId: "dev-sensor-01",
					property: "deviceId",
					comparison: "==",
					value: "dev-sensor-01",
				},
				{
					deviceId: "dev-sensor-01",
					property: "temperature",
					comparison: ">=",
					value: 28,
				},
			],
		});
		expect(parsedRule.actions).toEqual([
			{ deviceId: "dev-ac-01", desiredState: true },
		]);
	});

	it("AutomationCreationWizard_CompleteDeviceJourneyWithDeactivation_ShouldSubmitWithIsActiveFalse", async () => {
		// Arrange
		let capturedPayload: CreateAutomationPayload | null = null;
		server.use(
			http.post("*/api/automations", async ({ request }) => {
				capturedPayload = (await request.json()) as CreateAutomationPayload;
				return HttpResponse.json(
					{
						message: "Automação criada com sucesso!",
						automationId: "auto-device-1",
					},
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Act - Step 1: Dispositivo
		await user.click(
			await screen.findByRole("button", { name: /Dispositivo/i }),
		);
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 2: Configuração de Dispositivo (desligado)
		expect(
			await screen.findByRole("heading", { name: "Configure o dispositivo" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Lâmpada Quarto" }),
		);
		await user.click(screen.getByRole("button", { name: "Desligado" }));

		expect(
			screen.getByText(/Quando Lâmpada Quarto mudar para Desligado/i),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 3: Ação
		await user.click(
			await screen.findByRole("button", { name: /Adicionar Ação/i }),
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Ar Condicionado" }),
		);
		await user.click(screen.getByRole("button", { name: "Desligar" }));
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 4: Desativar switch "Ativar imediatamente"
		const nameInput = await screen.findByLabelText("Nome da automação");
		await user.type(nameInput, "Desligar Ar com Lâmpada");

		const activateSwitch = screen.getByRole("switch", {
			name: "Ativar automação imediatamente",
		});
		expect(activateSwitch).toBeChecked();
		await user.click(activateSwitch);
		expect(activateSwitch).not.toBeChecked();

		await user.click(screen.getByRole("button", { name: "Salvar Automação" }));

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		const payload = capturedPayload as unknown as CreateAutomationPayload;
		expect(payload.isActive).toBe(false);
		const parsedRule = JSON.parse(payload.rulePayload);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "device_state",
			deviceId: "dev-lamp-01",
			stateType: "isOn",
		});
		expect(parsedRule.conditions).toEqual({
			operator: "AND",
			rules: [
				{
					deviceId: "dev-lamp-01",
					property: "deviceId",
					comparison: "==",
					value: "dev-lamp-01",
				},
				{
					deviceId: "dev-lamp-01",
					property: "isOn",
					comparison: "==",
					value: false,
				},
			],
		});
	});

	it("AutomationCreationWizard_MultipleActionsWithEditAndRemove_ShouldSubmitExactActionsInOrder", async () => {
		// Arrange
		let capturedPayload: CreateAutomationPayload | null = null;
		server.use(
			http.post("*/api/automations", async ({ request }) => {
				capturedPayload = (await request.json()) as CreateAutomationPayload;
				return HttpResponse.json(
					{
						message: "Automação criada com sucesso!",
						automationId: "auto-multi-1",
					},
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Step 1 & 2 rápido com Horário
		await user.click(await screen.findByRole("button", { name: /Horário/i }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));
		await user.type(screen.getByLabelText("Horário"), "23:00");
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Act - Step 3: Adicionar ação 1 (Ligar Lâmpada Quarto)
		await user.click(
			await screen.findByRole("button", { name: /Adicionar Ação/i }),
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Lâmpada Quarto" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		// Adicionar ação 2 (Ligar Ar Condicionado)
		await user.click(screen.getByRole("button", { name: /Adicionar Ação/i }));
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Ar Condicionado" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(screen.getByText("Ligar Lâmpada Quarto")).toBeInTheDocument();
		expect(screen.getByText("Ligar Ar Condicionado")).toBeInTheDocument();

		// Editar ação 1: mudar para Desligar
		await user.click(screen.getByLabelText("Editar ação Lâmpada Quarto"));
		await user.click(screen.getByRole("button", { name: "Desligar" }));
		await user.click(screen.getByRole("button", { name: "Salvar ação" }));

		expect(
			await screen.findByText("Desligar Lâmpada Quarto"),
		).toBeInTheDocument();

		// Remover ação 2 (Ar Condicionado)
		await user.click(screen.getByLabelText("Remover ação Ar Condicionado"));
		expect(screen.queryByText("Ligar Ar Condicionado")).not.toBeInTheDocument();

		// Readicionar Ar Condicionado como Desligar
		await user.click(screen.getByRole("button", { name: /Adicionar Ação/i }));
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Ar Condicionado" }),
		);
		await user.click(screen.getByRole("button", { name: "Desligar" }));
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 4: Salvar
		await user.type(
			screen.getByLabelText("Nome da automação"),
			"Desligar Tudo",
		);
		await user.click(screen.getByRole("button", { name: "Salvar Automação" }));

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		const parsedRule = JSON.parse(
			(capturedPayload as unknown as CreateAutomationPayload).rulePayload,
		);
		expect(parsedRule.actions).toEqual([
			{ deviceId: "dev-lamp-01", desiredState: false },
			{ deviceId: "dev-ac-01", desiredState: false },
		]);
	});

	it("AutomationCreationWizard_NavigationBackAndForward_ShouldPreserveEnteredData", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Act - Step 1: Escolhe Horário e avança
		await user.click(await screen.findByRole("button", { name: /Horário/i }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 2: Digita horário e volta pro Step 1
		await user.type(screen.getByLabelText("Horário"), "14:45");
		await user.click(screen.getByRole("button", { name: "Voltar" }));

		// Step 1: Horário deve continuar selecionado
		expect(screen.getByRole("button", { name: /Horário/i })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 2: Horário 14:45 deve estar preservado
		expect(screen.getByLabelText("Horário")).toHaveValue("14:45");
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 3: Adiciona ação e volta pro Step 2
		await user.click(
			await screen.findByRole("button", { name: /Adicionar Ação/i }),
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Lâmpada Quarto" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(screen.getByRole("button", { name: "Voltar" }));

		// Step 2: Dados intactos
		expect(screen.getByLabelText("Horário")).toHaveValue("14:45");
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 3: Ação intacta
		expect(screen.getByText("Ligar Lâmpada Quarto")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		// Step 4: Editar Gatilho deve voltar ao Step 2
		expect(
			await screen.findByRole("heading", { name: "Tudo pronto?" }),
		).toBeInTheDocument();
		const editTriggerButtons = screen.getAllByRole("button", {
			name: /Editar/i,
		});
		await user.click(editTriggerButtons[0]); // Editar gatilho

		expect(
			await screen.findByRole("heading", { name: "Configure o horário" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Horário")).toHaveValue("14:45");

		// Avança de volta até o Step 4
		await user.click(screen.getByRole("button", { name: "Próximo" })); // Step 3
		await user.click(screen.getByRole("button", { name: "Próximo" })); // Step 4

		// Editar Ações deve voltar ao Step 3
		const editActionButtons = screen.getAllByRole("button", {
			name: /Editar/i,
		});
		await user.click(editActionButtons[1]); // Editar ações

		expect(
			await screen.findByRole("heading", { name: "O que deve acontecer?" }),
		).toBeInTheDocument();
		expect(screen.getByText("Ligar Lâmpada Quarto")).toBeInTheDocument();
	});

	it("AutomationCreationWizard_MissingRequiredFields_ShouldDisableNextButtonAndPreventHttpCall", async () => {
		// Arrange
		let httpCallCount = 0;
		server.use(
			http.post("*/api/automations", () => {
				httpCallCount++;
				return HttpResponse.json({}, { status: 200 });
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Step 1: Próximo desabilitado sem seleção
		const nextStep1 = await screen.findByRole("button", { name: "Próximo" });
		expect(nextStep1).toBeDisabled();

		// Clicar em opção "Em breve" (Localização) continua desabilitado
		const locationButton = screen.getByRole("button", { name: /Localização/i });
		expect(locationButton).toBeDisabled();
		expect(nextStep1).toBeDisabled();

		// Seleciona Horário e avança
		await user.click(screen.getByRole("button", { name: /Horário/i }));
		await user.click(nextStep1);

		// Step 2: Sem horário preenchido, Próximo é desabilitado
		const nextStep2 = await screen.findByRole("button", { name: "Próximo" });
		expect(nextStep2).toBeDisabled();

		// Preenche horário mas remove todos os dias da semana
		await user.type(screen.getByLabelText("Horário"), "12:00");
		expect(nextStep2).toBeEnabled();

		// Desmarca todos os 7 dias
		const weekdays = [
			"Domingo",
			"Segunda",
			"Terça",
			"Quarta",
			"Quinta",
			"Sexta",
			"Sábado",
		];
		for (const day of weekdays) {
			await user.click(screen.getByTitle(day));
		}
		expect(nextStep2).toBeDisabled();

		// Remarca um dia
		await user.click(screen.getByTitle("Segunda"));
		expect(nextStep2).toBeEnabled();
		await user.click(nextStep2);

		// Step 3: Sem ações, Próximo é desabilitado
		const nextStep3 = await screen.findByRole("button", { name: "Próximo" });
		expect(nextStep3).toBeDisabled();

		// Assert: Nenhuma chamada HTTP foi disparada
		expect(httpCallCount).toBe(0);
	});

	it("AutomationCreationWizard_ApiReturns500_ShouldShowErrorAndKeepWizardOpenWithData", async () => {
		// Arrange
		server.use(
			http.post("*/api/automations", () => {
				return HttpResponse.json(
					{
						title: "Internal Server Error",
						detail: "Falha ao salvar no banco.",
					},
					{ status: 500 },
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Passo 1 a 4
		await user.click(await screen.findByRole("button", { name: /Horário/i }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));
		await user.type(screen.getByLabelText("Horário"), "08:00");
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		await user.click(
			await screen.findByRole("button", { name: /Adicionar Ação/i }),
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(
			await screen.findByRole("option", { name: "Lâmpada Quarto" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		await user.type(
			screen.getByLabelText("Nome da automação"),
			"Automação com Falha",
		);
		await user.click(screen.getByRole("button", { name: "Salvar Automação" }));

		// Assert
		await waitFor(() => {
			expect(useAutomationsUIStore.getState().isCreateWizardOpen).toBe(true);
		});

		expect(
			await screen.findByText("Falha ao salvar no banco."),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Nome da automação")).toHaveValue(
			"Automação com Falha",
		);
	});

	it("AutomationCreationWizard_CloseWithProgress_ShowsConfirmationDialogBeforeDiscarding", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		useAutomationsUIStore.getState().openCreateWizard();
		renderWithProviders(<AutomationCreationWizard />);

		// Act - Começa a preencher (progresso existe)
		await user.click(await screen.findByRole("button", { name: /Horário/i }));

		// Tenta fechar clicando no botão Close do Dialog
		const closeDialogButton = screen.getByRole("button", { name: "Close" });
		await user.click(closeDialogButton);

		// Assert: Modal de confirmação aparece
		expect(
			await screen.findByText("Descartar essa automação?"),
		).toBeInTheDocument();
		expect(
			screen.getByText("O progresso preenchido será perdido."),
		).toBeInTheDocument();

		// Clica em Cancelar: Wizard permanece aberto
		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(
			screen.queryByText("Descartar essa automação?"),
		).not.toBeInTheDocument();
		expect(useAutomationsUIStore.getState().isCreateWizardOpen).toBe(true);

		// Clica em Close novamente e confirma descarte
		await user.click(closeDialogButton);
		expect(
			await screen.findByText("Descartar essa automação?"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Descartar" }));

		// Assert: Wizard fechou e foi resetado
		await waitFor(() => {
			expect(useAutomationsUIStore.getState().isCreateWizardOpen).toBe(false);
		});
	});
});
