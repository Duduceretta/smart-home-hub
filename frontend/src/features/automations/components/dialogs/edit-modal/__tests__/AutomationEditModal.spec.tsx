import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useAutomationsUIStore } from "@/features/automations/store/automations-ui.store";
import type {
	Automation,
	AutomationPayload,
	UpdateAutomationPayload,
} from "@/features/automations/types/automations.types";
import {
	createAutomationMock,
	createPickerDeviceMock,
} from "@/testing/mocks/automations.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { AutomationEditModal } from "../AutomationEditModal";

/**
 * Automação com gatilho de sensor (temperatura > 25) — exercita o caminho
 * de `mapAutomationToFormState` que `mapAutomationToFormState.spec.ts` (se
 * existir) não cobriria isoladamente, junto do fluxo real de edição.
 */
function createSensorAutomationMock(
	overrides?: Partial<Automation>,
): Automation {
	const payload: AutomationPayload = {
		triggers: [
			{
				type: "device_state",
				id: "trigger-1",
				deviceId: "dev-sensor-01",
				stateType: "temperature",
			},
		],
		conditions: {
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
					comparison: ">",
					value: 25,
				},
			],
		},
		actions: [{ deviceId: "dev-lamp-01", desiredState: true }],
	};

	return createAutomationMock({
		id: "automation-sensor-1",
		name: "Ligar lâmpada quando esquentar",
		isActive: true,
		rulePayload: JSON.stringify(payload),
		...overrides,
	});
}

function mockPickerDevices() {
	server.use(
		http.get("*/api/devices", () =>
			HttpResponse.json([
				createPickerDeviceMock({ id: "dev-sensor-01", name: "Sensor Sala" }),
				createPickerDeviceMock({ id: "dev-lamp-01", name: "Lâmpada Sala" }),
			]),
		),
	);
}

beforeEach(() => {
	useAutomationsUIStore.setState({ editingAutomation: null });
});

describe("AutomationEditModal Integration Tests", () => {
	it("AutomationEditModal_OpenWithSensorAutomation_ShouldPrefillFormFromRulePayload", async () => {
		// Arrange
		mockPickerDevices();
		const automation = createSensorAutomationMock();

		// Act
		renderWithProviders(<AutomationEditModal />);
		useAutomationsUIStore.getState().openEditModal(automation);

		// Assert — nome e valor do sensor reconstruídos do rulePayload
		expect(
			await screen.findByDisplayValue("Ligar lâmpada quando esquentar"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Valor")).toHaveValue(25);
		expect(
			screen.getByRole("button", { name: "Salvar Alterações" }),
		).toBeDisabled();
	});

	it("AutomationEditModal_ChangeSensorValue_ShouldEnableSaveAndSubmitUpdatedPayload", async () => {
		// Arrange
		mockPickerDevices();
		const automation = createSensorAutomationMock();
		let capturedPayload: UpdateAutomationPayload | null = null;
		server.use(
			http.put("*/api/automations/:id", async ({ request }) => {
				capturedPayload = (await request.json()) as UpdateAutomationPayload;
				return HttpResponse.json({
					id: automation.id,
					name: automation.name,
					isActive: automation.isActive,
				});
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AutomationEditModal />);
		useAutomationsUIStore.getState().openEditModal(automation);
		await screen.findByLabelText("Valor");

		// Act — muda o limiar de temperatura de 25 para 30
		const valueInput = screen.getByLabelText("Valor");
		await user.clear(valueInput);
		await user.type(valueInput, "30");
		await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});
		const parsedRule = JSON.parse(
			(capturedPayload as unknown as UpdateAutomationPayload).rulePayload,
		) as AutomationPayload;
		expect(parsedRule.conditions?.rules).toContainEqual(
			expect.objectContaining({
				deviceId: "dev-sensor-01",
				property: "temperature",
				comparison: ">",
				value: 30,
			}),
		);
		// Ação e nome preservados sem alteração
		expect(parsedRule.actions).toEqual([
			{ deviceId: "dev-lamp-01", desiredState: true },
		]);
		expect(capturedPayload).toMatchObject({
			name: "Ligar lâmpada quando esquentar",
		});
	});

	it("AutomationEditModal_CloseWithUnsavedChanges_ShouldPromptDiscardConfirmation", async () => {
		// Arrange
		mockPickerDevices();
		const automation = createSensorAutomationMock();
		const user = userEvent.setup();
		renderWithProviders(<AutomationEditModal />);
		useAutomationsUIStore.getState().openEditModal(automation);
		await screen.findByLabelText("Valor");

		// Act — muda algo e tenta cancelar
		await user.clear(screen.getByLabelText("Valor"));
		await user.type(screen.getByLabelText("Valor"), "30");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		// Assert
		expect(
			await screen.findByText("Descartar alterações?"),
		).toBeInTheDocument();
	});
});
