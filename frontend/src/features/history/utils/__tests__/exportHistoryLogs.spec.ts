import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryEvent } from "../../types/history.types";
import { exportEventsAsCsv, exportEventsAsJson } from "../exportHistoryLogs";

describe("exportHistoryLogs Integration Tests", () => {
	let appendChildSpy: ReturnType<typeof vi.spyOn>;
	let clickSpy: ReturnType<typeof vi.fn>;
	let removeSpy: ReturnType<typeof vi.fn>;
	let createdAnchor: HTMLAnchorElement | null = null;

	const mockEvent: HistoryEvent = {
		id: "evt-001",
		timestampUtc: "2026-09-02T12:00:00.000Z",
		eventType: "DeviceStateChanged",
		description: 'Lâmpada "Principal" ligada',
		source: "Device",
		severity: "Information",
		deviceName: 'Lâmpada "Sala"',
		roomName: "Sala de Estar",
		deviceGroupName: "Luzes",
		oldValue: "off",
		newValue: "on",
	};

	beforeEach(() => {
		createdAnchor = null;
		clickSpy = vi.fn();
		removeSpy = vi.fn();

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				const element = originalCreateElement(tagName);
				if (tagName.toLowerCase() === "a") {
					createdAnchor = element as HTMLAnchorElement;
					createdAnchor.click = clickSpy as unknown as () => void;
					createdAnchor.remove = removeSpy as unknown as () => void;
				}
				return element;
			},
		);

		appendChildSpy = vi.spyOn(document.body, "appendChild");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("exportEventsAsJson", () => {
		it("exportEventsAsJson_WithEvents_TriggersDownloadWithValidJsonContent", () => {
			// Arrange
			const events = [mockEvent];

			// Act
			exportEventsAsJson(events);

			// Assert
			expect(document.createElement).toHaveBeenCalledWith("a");
			expect(appendChildSpy).toHaveBeenCalledWith(createdAnchor);
			expect(clickSpy).toHaveBeenCalledTimes(1);
			expect(removeSpy).toHaveBeenCalledTimes(1);

			expect(createdAnchor?.getAttribute("download")).toMatch(
				/^audit-logs-\d{4}-\d{2}-\d{2}\.json$/,
			);

			const href = createdAnchor?.getAttribute("href") ?? "";
			expect(href.startsWith("data:text/json;charset=utf-8,")).toBe(true);

			const rawJson = decodeURIComponent(
				href.replace("data:text/json;charset=utf-8,", ""),
			);
			const parsed = JSON.parse(rawJson);
			expect(parsed).toEqual(events);
		});

		it("exportEventsAsJson_WithCustomFilename_UsesCustomFilename", () => {
			// Arrange
			const events = [mockEvent];
			const customFilename = "custom-export.json";

			// Act
			exportEventsAsJson(events, customFilename);

			// Assert
			expect(createdAnchor?.getAttribute("download")).toBe(customFilename);
		});

		it("exportEventsAsJson_WithEmptyList_GeneratesEmptyJsonArray", () => {
			// Arrange
			const events: HistoryEvent[] = [];

			// Act
			exportEventsAsJson(events);

			// Assert
			const href = createdAnchor?.getAttribute("href") ?? "";
			const rawJson = decodeURIComponent(
				href.replace("data:text/json;charset=utf-8,", ""),
			);
			expect(JSON.parse(rawJson)).toEqual([]);
		});
	});

	describe("exportEventsAsCsv", () => {
		it("exportEventsAsCsv_WithEvents_TriggersDownloadWithProperHeadersAndRows", () => {
			// Arrange
			const events = [mockEvent];

			// Act
			exportEventsAsCsv(events);

			// Assert
			expect(document.createElement).toHaveBeenCalledWith("a");
			expect(appendChildSpy).toHaveBeenCalledWith(createdAnchor);
			expect(clickSpy).toHaveBeenCalledTimes(1);
			expect(removeSpy).toHaveBeenCalledTimes(1);

			expect(createdAnchor?.getAttribute("download")).toMatch(
				/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/,
			);

			const href = createdAnchor?.getAttribute("href") ?? "";
			expect(href.startsWith("data:text/csv;charset=utf-8,")).toBe(true);

			const rawCsv = decodeURI(
				href.replace("data:text/csv;charset=utf-8,", ""),
			);
			const lines = rawCsv.split("\n");

			expect(lines[0]).toBe(
				"ID,Timestamp (UTC),EventType,Description,Source,Severity,Device,Room,DeviceGroup,OldValue,NewValue",
			);
			expect(lines[1]).toBe(
				'evt-001,2026-09-02T12:00:00.000Z,DeviceStateChanged,"Lâmpada ""Principal"" ligada",Device,Information,"Lâmpada ""Sala""","Sala de Estar","Luzes","off","on"',
			);
		});

		it("exportEventsAsCsv_WithCustomFilename_UsesCustomFilename", () => {
			// Arrange
			const events = [mockEvent];
			const customFilename = "relatorio-auditoria.csv";

			// Act
			exportEventsAsCsv(events, customFilename);

			// Assert
			expect(createdAnchor?.getAttribute("download")).toBe(customFilename);
		});

		it("exportEventsAsCsv_WithEmptyList_OutputsOnlyHeaders", () => {
			// Arrange
			const events: HistoryEvent[] = [];

			// Act
			exportEventsAsCsv(events);

			// Assert
			const href = createdAnchor?.getAttribute("href") ?? "";
			const rawCsv = decodeURI(
				href.replace("data:text/csv;charset=utf-8,", ""),
			);
			const lines = rawCsv.split("\n");

			expect(lines).toHaveLength(1);
			expect(lines[0]).toBe(
				"ID,Timestamp (UTC),EventType,Description,Source,Severity,Device,Room,DeviceGroup,OldValue,NewValue",
			);
		});

		it("exportEventsAsCsv_WithMissingOptionalFields_FormatsWithoutError", () => {
			// Arrange
			const minimalEvent: HistoryEvent = {
				id: "evt-002",
				timestampUtc: "2026-09-02T14:00:00.000Z",
				eventType: "SystemHealthCheck",
				description: "",
				source: "System",
				severity: "Warning",
			};

			// Act
			exportEventsAsCsv([minimalEvent]);

			// Assert
			const href = createdAnchor?.getAttribute("href") ?? "";
			const rawCsv = decodeURI(
				href.replace("data:text/csv;charset=utf-8,", ""),
			);
			const lines = rawCsv.split("\n");

			expect(lines[1]).toBe(
				'evt-002,2026-09-02T14:00:00.000Z,SystemHealthCheck,"",System,Warning,"","","","",""',
			);
		});
	});
});
