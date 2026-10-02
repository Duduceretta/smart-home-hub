import { describe, expect, it } from "vitest";
import { formatLastActivation } from "../format-last-activation";

const NOW = new Date("2026-10-01T12:00:00.000Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatLastActivation", () => {
	it("formatLastActivation_NeverActivated_ShouldReturnNull", () => {
		expect(formatLastActivation(null, "pt-BR", NOW)).toBeNull();
	});

	it("formatLastActivation_InvalidDate_ShouldReturnNull", () => {
		expect(formatLastActivation("not-a-date", "pt-BR", NOW)).toBeNull();
	});

	it("formatLastActivation_JustNow_ShouldUseTheNowWording", () => {
		expect(formatLastActivation(ago(10 * SECOND), "pt-BR", NOW)).toBe("agora");
	});

	it("formatLastActivation_MinutesAgo_ShouldUseMinutes", () => {
		expect(formatLastActivation(ago(5 * MINUTE), "pt-BR", NOW)).toBe(
			"há 5 minutos",
		);
	});

	it("formatLastActivation_HoursAgo_ShouldUseHours", () => {
		expect(formatLastActivation(ago(2 * HOUR), "pt-BR", NOW)).toBe(
			"há 2 horas",
		);
	});

	it("formatLastActivation_Yesterday_ShouldUseTheYesterdayWording", () => {
		expect(formatLastActivation(ago(DAY + HOUR), "pt-BR", NOW)).toBe("ontem");
	});

	it("formatLastActivation_DaysAgo_ShouldUseDays", () => {
		expect(formatLastActivation(ago(4 * DAY), "pt-BR", NOW)).toBe("há 4 dias");
	});

	it("formatLastActivation_EnglishLocale_ShouldUseEnglishWording", () => {
		expect(formatLastActivation(ago(2 * HOUR), "en-US", NOW)).toBe(
			"2 hours ago",
		);
	});

	it("formatLastActivation_ClockSkewPutsTheDateInTheFuture_ShouldTreatAsNow", () => {
		expect(formatLastActivation(ago(-30 * SECOND), "pt-BR", NOW)).toBe("agora");
	});
});
