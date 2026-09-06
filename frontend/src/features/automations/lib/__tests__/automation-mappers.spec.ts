import { describe, expect, it } from "vitest";
import {
	type Automation,
	AutomationTriggerKindEnum,
	type PickerDevice,
} from "../../types/automations.types";
import { mapAutomationToFormState } from "../automation-edit-state.mapper";
import { mapAutomationToView } from "../automation-view.mapper";

const mockPickerDevices: PickerDevice[] = [
	{
		id: "dev-sensor-1",
		name: "Sensor de Temperatura",
		type: 4,
		isOnline: true,
	},
	{
		id: "dev-light-1",
		name: "Lâmpada do Quarto",
		type: 1,
		isOnline: true,
	},
];

describe("automation-edit-state.mapper", () => {
	it("mapAutomationToFormState_InvalidJsonPayload_ShouldReturnDefaultsAndNullTrigger", () => {
		// Arrange
		const automation: Automation = {
			id: "auto-1",
			name: "Automação Corrompida",
			isActive: false,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Sensor,
			rulePayload: "invalid-json",
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBeNull();
		expect(formState.name).toBe("Automação Corrompida");
		expect(formState.activateImmediately).toBe(false);
		expect(formState.actions).toEqual([]);
	});

	it("mapAutomationToFormState_SensorTriggerPayload_ShouldReconstructSensorFormState", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "device_state",
					deviceId: "dev-sensor-1",
					stateType: "temperature",
				},
			],
			conditions: {
				operator: "AND",
				rules: [
					{
						property: "deviceId",
						comparison: "==",
						value: "dev-sensor-1",
						deviceId: "dev-sensor-1",
					},
					{
						property: "temperature",
						comparison: ">",
						value: 28,
						deviceId: "dev-sensor-1",
					},
				],
			},
			actions: [
				{
					deviceId: "dev-light-1",
					desiredState: true,
				},
			],
		};

		const automation: Automation = {
			id: "auto-sensor",
			name: "Alerta de Calor",
			isActive: true,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Sensor,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBe("sensor");
		expect(formState.sensorConfig).toEqual({
			deviceId: "dev-sensor-1",
			metric: "temperature",
			comparison: ">",
			value: "28",
		});
		expect(formState.actions).toHaveLength(1);
		expect(formState.actions[0].deviceId).toBe("dev-light-1");
		expect(formState.actions[0].desiredState).toBe(true);
		expect(formState.activateImmediately).toBe(true);
	});

	it("mapAutomationToFormState_DeviceStateTriggerPayload_ShouldReconstructDeviceFormState", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "device_state",
					deviceId: "dev-sensor-1",
					stateType: "isOn",
				},
			],
			conditions: {
				operator: "AND",
				rules: [
					{
						property: "isOn",
						comparison: "==",
						value: true,
						deviceId: "dev-sensor-1",
					},
				],
			},
			actions: [],
		};

		const automation: Automation = {
			id: "auto-dev",
			name: "Dispositivo Ligado",
			isActive: true,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Sensor,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBe("device");
		expect(formState.deviceConfig).toEqual({
			deviceId: "dev-sensor-1",
			desiredIsOn: true,
		});
	});

	it("mapAutomationToFormState_ScheduleTriggerWithValidCron_ShouldReconstructScheduleFormState", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "time",
					cronExpression: "30 21 * * 1,2,3,4,5",
				},
			],
			conditions: null,
			actions: [],
		};

		const automation: Automation = {
			id: "auto-sched",
			name: "Rotina Noturna",
			isActive: true,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Schedule,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBe("schedule");
		expect(formState.scheduleConfig).toEqual({
			time: "21:30",
			weekdays: [1, 2, 3, 4, 5],
		});
	});

	it("mapAutomationToFormState_ScheduleTriggerWithAsteriskWeekdays_ShouldSetAllWeekdays", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "time",
					cronExpression: "0 8 * * *",
				},
			],
			conditions: null,
			actions: [],
		};

		const automation: Automation = {
			id: "auto-all-days",
			name: "Todo dia 8h",
			isActive: false,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Schedule,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBe("schedule");
		expect(formState.scheduleConfig).toEqual({
			time: "08:00",
			weekdays: [0, 1, 2, 3, 4, 5, 6],
		});
	});

	it("mapAutomationToFormState_ScheduleTriggerWithIrregularCron_ShouldFallbackToDefaultConfig", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "time",
					cronExpression: "*/5 * 1 1 *", // Irregular cron not matching standard wizard output
				},
			],
			conditions: null,
			actions: [],
		};

		const automation: Automation = {
			id: "auto-irregular",
			name: "Cron Manual",
			isActive: false,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Schedule,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const formState = mapAutomationToFormState(automation);

		// Assert
		expect(formState.triggerSource).toBe("schedule");
		expect(formState.scheduleConfig.time).toBe("");
		expect(formState.scheduleConfig.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});
});

describe("automation-view.mapper", () => {
	it("mapAutomationToView_InvalidJsonPayload_ShouldHandleGracefully", () => {
		// Arrange
		const automation: Automation = {
			id: "auto-broken",
			name: "Quebrada",
			isActive: false,
			isDraft: true,
			triggerKind: AutomationTriggerKindEnum.Sensor,
			rulePayload: "not-json",
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const view = mapAutomationToView(automation, mockPickerDevices);

		// Assert
		expect(view.triggerSummary).toBe("Sem gatilho configurado");
		expect(view.conditionSummary).toBeNull();
		expect(view.actionSummaries).toEqual([]);
		expect(view.isDraft).toBe(true);
	});

	it("mapAutomationToView_TimeTriggerDailyAndPresets_ShouldFormatHumanizedCron", () => {
		// Daily at 22:00
		const dailyPayload = {
			triggers: [{ type: "time", cronExpression: "0 22 * * *" }],
			actions: [],
		};
		const dailyAuto: Automation = {
			id: "auto-1",
			name: "Diária",
			isActive: true,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Schedule,
			rulePayload: JSON.stringify(dailyPayload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		const dailyView = mapAutomationToView(dailyAuto, mockPickerDevices);
		expect(dailyView.triggerSummary).toBe("Todos os dias às 22:00");

		// Weekdays preset "1-5"
		const weekdayPayload = {
			triggers: [{ type: "time", cronExpression: "30 7 * * 1-5" }],
			actions: [],
		};
		const weekdayAuto = {
			...dailyAuto,
			rulePayload: JSON.stringify(weekdayPayload),
		};
		const weekdayView = mapAutomationToView(weekdayAuto, mockPickerDevices);
		expect(weekdayView.triggerSummary).toBe("Segunda a sexta às 07:30");

		// Custom/unrecognized cron
		const customPayload = {
			triggers: [{ type: "time", cronExpression: "15 10 1 * *" }],
			actions: [],
		};
		const customAuto = {
			...dailyAuto,
			rulePayload: JSON.stringify(customPayload),
		};
		const customView = mapAutomationToView(customAuto, mockPickerDevices);
		expect(customView.triggerSummary).toBe("Cron: 15 10 1 * *");
	});

	it("mapAutomationToView_SensorTriggerAndConditions_ShouldDescribePropertiesAndActions", () => {
		// Arrange
		const payload = {
			triggers: [
				{
					type: "device_state",
					deviceId: "dev-sensor-1",
					stateType: "temperature",
				},
			],
			conditions: {
				operator: "AND",
				rules: [
					{
						deviceId: "dev-sensor-1",
						property: "temperature",
						comparison: ">=",
						value: 30,
					},
					{
						deviceId: "dev-light-1",
						property: "isOn",
						comparison: "==",
						value: false,
					},
				],
			},
			actions: [
				{
					deviceId: "dev-light-1",
					desiredState: true,
				},
				{
					deviceId: "unknown-dev",
					desiredState: false,
				},
			],
		};

		const automation: Automation = {
			id: "auto-full",
			name: "Controle Completo",
			isActive: true,
			isDraft: false,
			triggerKind: AutomationTriggerKindEnum.Sensor,
			rulePayload: JSON.stringify(payload),
			createdAt: "2026-09-01T00:00:00Z",
			updatedAt: "2026-09-01T00:00:00Z",
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		// Act
		const view = mapAutomationToView(automation, mockPickerDevices);

		// Assert
		expect(view.triggerSummary).toBe(
			"Quando Sensor de Temperatura mudar (temperature)",
		);
		expect(view.conditionSummary).toBe(
			"Sensor de Temperatura (temperatura) ≥ 30°C E Lâmpada do Quarto (estado) = desligado",
		);
		expect(view.actionSummaries).toEqual([
			"Ligar Lâmpada do Quarto",
			"Desligar dispositivo removido",
		]);
	});
});
