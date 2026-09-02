import { describe, expect, it } from "vitest";
import type { AutomationFormState } from "../../types/automation-wizard.types";
import {
	mapFormStateToUpdatePayload,
	mapWizardStateToCreatePayload,
} from "../automation-wizard-payload.mapper";

describe("automation-wizard-payload.mapper Unit Tests", () => {
	const createBaseFormState = (): AutomationFormState => ({
		triggerSource: "schedule",
		sensorConfig: {
			deviceId: "sensor-01",
			metric: "temperature",
			comparison: ">",
			value: "25",
		},
		deviceConfig: {
			deviceId: "device-01",
			desiredIsOn: true,
		},
		scheduleConfig: {
			time: "07:30",
			weekdays: [0, 1, 2, 3, 4, 5, 6],
		},
		actions: [],
		editingActionId: null,
		name: "  Ligar Aquecedor  ",
		activateImmediately: true,
	});

	it("mapWizardStateToCreatePayload_ScheduleTriggerAllDays_ShouldGenerateWildcardCronAndNullConditions", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			triggerSource: "schedule",
			scheduleConfig: {
				time: "22:15",
				weekdays: [0, 1, 2, 3, 4, 5, 6],
			},
			name: "  Desligar Tudo  ",
			activateImmediately: true,
		};

		// Act
		const payload = mapWizardStateToCreatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(payload.name).toBe("Desligar Tudo");
		expect(payload.isActive).toBe(true);
		expect(parsedRule.triggers).toHaveLength(1);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "time",
			cronExpression: "15 22 * * *",
		});
		expect(parsedRule.conditions).toBeNull();
		expect(parsedRule.actions).toEqual([]);
	});

	it("mapWizardStateToCreatePayload_ScheduleTriggerSpecificDays_ShouldSortWeekdaysInCron", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			triggerSource: "schedule",
			scheduleConfig: {
				time: "08:05",
				weekdays: [5, 1, 3], // sexta, segunda, quarta (desordenados)
			},
		};

		// Act
		const payload = mapWizardStateToCreatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(parsedRule.triggers[0].cronExpression).toBe("5 8 * * 1,3,5");
		expect(parsedRule.conditions).toBeNull();
	});

	it("mapWizardStateToCreatePayload_SensorTrigger_ShouldMapDeviceStateTriggerAndScopedConditions", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			triggerSource: "sensor",
			sensorConfig: {
				deviceId: "sensor-temp-01",
				metric: "temperature",
				comparison: ">=",
				value: "28.5",
			},
			name: "Alerta Temperatura Alta",
			activateImmediately: false,
		};

		// Act
		const payload = mapWizardStateToCreatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(payload.name).toBe("Alerta Temperatura Alta");
		expect(payload.isActive).toBe(false);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "device_state",
			deviceId: "sensor-temp-01",
			stateType: "temperature",
		});
		expect(parsedRule.conditions).toEqual({
			operator: "AND",
			rules: [
				{
					deviceId: "sensor-temp-01",
					property: "deviceId",
					comparison: "==",
					value: "sensor-temp-01",
				},
				{
					deviceId: "sensor-temp-01",
					property: "temperature",
					comparison: ">=",
					value: 28.5,
				},
			],
		});
	});

	it("mapWizardStateToCreatePayload_DeviceTrigger_ShouldMapDeviceStateTriggerWithIsOnCondition", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			triggerSource: "device",
			deviceConfig: {
				deviceId: "switch-01",
				desiredIsOn: false,
			},
		};

		// Act
		const payload = mapWizardStateToCreatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "device_state",
			deviceId: "switch-01",
			stateType: "isOn",
		});
		expect(parsedRule.conditions).toEqual({
			operator: "AND",
			rules: [
				{
					deviceId: "switch-01",
					property: "deviceId",
					comparison: "==",
					value: "switch-01",
				},
				{
					deviceId: "switch-01",
					property: "isOn",
					comparison: "==",
					value: false,
				},
			],
		});
	});

	it("mapWizardStateToCreatePayload_WithMultipleActions_ShouldMapAllActionsInOrder", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			actions: [
				{ id: "act-1", deviceId: "lamp-01", desiredState: true },
				{ id: "act-2", deviceId: "ac-01", desiredState: false },
				{ id: "act-3", deviceId: "curtain-01", desiredState: true },
			],
		};

		// Act
		const payload = mapWizardStateToCreatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(parsedRule.actions).toEqual([
			{ deviceId: "lamp-01", desiredState: true },
			{ deviceId: "ac-01", desiredState: false },
			{ deviceId: "curtain-01", desiredState: true },
		]);
	});

	it("mapFormStateToUpdatePayload_ValidState_ShouldProduceIdenticalUpdatePayload", () => {
		// Arrange
		const state: AutomationFormState = {
			...createBaseFormState(),
			triggerSource: "device",
			deviceConfig: {
				deviceId: "motion-01",
				desiredIsOn: true,
			},
			name: "Atualizar Nome",
			activateImmediately: true,
		};

		// Act
		const payload = mapFormStateToUpdatePayload(state);
		const parsedRule = JSON.parse(payload.rulePayload);

		// Assert
		expect(payload.name).toBe("Atualizar Nome");
		expect(payload.isActive).toBe(true);
		expect(parsedRule.triggers[0]).toMatchObject({
			type: "device_state",
			deviceId: "motion-01",
			stateType: "isOn",
		});
	});
});
