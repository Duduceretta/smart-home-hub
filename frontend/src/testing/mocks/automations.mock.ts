import type {
	Automation,
	AutomationFilterCounts,
	PickerDevice,
} from "@/features/automations/types/automations.types";

export function createAutomationMock(overrides?: Partial<Automation>): Automation {
	const defaultMock: Automation = {
		id: "automation-01",
		name: "Desligar tudo à noite",
		isActive: true,
		rulePayload: JSON.stringify({
			triggers: [{ type: "time", id: "t1", cronExpression: "0 23 * * *" }],
			conditions: null,
			actions: [{ deviceId: "device-01", desiredState: false }],
		}),
		schemaVersion: 1,
		triggerKind: 1,
		isDraft: false,
		createdAt: "2026-08-20T10:00:00Z",
		updatedAt: null,
		lastExecutedAt: "2026-08-25T23:00:00Z",
		hasFailedToday: false,
	};

	return { ...defaultMock, ...overrides };
}

export function createPickerDeviceMock(
	overrides?: Partial<PickerDevice>,
): PickerDevice {
	const defaultMock: PickerDevice = {
		id: "device-01",
		name: "Lâmpada Quarto",
		brand: "Philips",
		isOn: true,
	};

	return { ...defaultMock, ...overrides };
}

export function createAutomationFilterCountsMock(
	overrides?: Partial<AutomationFilterCounts>,
): AutomationFilterCounts {
	const defaultMock: AutomationFilterCounts = {
		total: 2,
		active: 1,
		inactive: 1,
		schedule: 1,
		sensor: 1,
		draft: 0,
	};

	return { ...defaultMock, ...overrides };
}
