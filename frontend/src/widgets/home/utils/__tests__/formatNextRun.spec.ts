import { afterEach, describe, expect, it, vi } from "vitest";
import { formatNextRun } from "../formatNextRun";

// Constrói horários em hora LOCAL da máquina de teste (não UTC) — evita
// aritmética manual de fuso nos casos de borda; new Date(y, m, d, h, min)
// já interpreta os campos como hora local, igual ao relógio do usuário.
function localDate(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
) {
	return new Date(year, month - 1, day, hour, minute, 0);
}

describe("formatNextRun", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("formatNextRun_LaterToday_ShouldPrefixWithHoje", () => {
		vi.useFakeTimers();
		vi.setSystemTime(localDate(2026, 9, 24, 9, 0)); // quinta, 09:00 local

		const nextRun = localDate(2026, 9, 24, 23, 0).toISOString();
		expect(formatNextRun(nextRun, "pt-BR")).toBe("Hoje, 23:00");
	});

	it("formatNextRun_Tomorrow_ShouldPrefixWithAmanha", () => {
		vi.useFakeTimers();
		vi.setSystemTime(localDate(2026, 9, 24, 9, 0));

		const nextRun = localDate(2026, 9, 25, 7, 0).toISOString();
		expect(formatNextRun(nextRun, "pt-BR")).toBe("Amanhã, 07:00");
	});

	it("formatNextRun_FurtherOut_ShouldUseWeekdayName", () => {
		vi.useFakeTimers();
		vi.setSystemTime(localDate(2026, 9, 24, 9, 0)); // quinta

		// +3 dias de calendário local = domingo, 2026-09-27.
		const nextRun = localDate(2026, 9, 27, 8, 0).toISOString();
		expect(formatNextRun(nextRun, "pt-BR")).toBe("Domingo, 08:00");
	});

	it("formatNextRun_EnglishLocale_ShouldUseEnglishLabels", () => {
		vi.useFakeTimers();
		vi.setSystemTime(localDate(2026, 9, 24, 9, 0));

		expect(
			formatNextRun(localDate(2026, 9, 24, 23, 0).toISOString(), "en-US"),
		).toBe("Today, 23:00");
		expect(
			formatNextRun(localDate(2026, 9, 25, 7, 0).toISOString(), "en-US"),
		).toBe("Tomorrow, 07:00");
	});

	it("formatNextRun_AroundLocalMidnight_ShouldSwitchFromHojeToAmanhaByCalendarDayNotHourCount", () => {
		vi.useFakeTimers();
		vi.setSystemTime(localDate(2026, 9, 24, 23, 59));

		// Ainda dia 24 local, minutos depois: continua "Hoje".
		expect(
			formatNextRun(localDate(2026, 9, 24, 23, 59).toISOString(), "pt-BR"),
		).toMatch(/^Hoje,/);
		// Virou o dia local: já é "Amanhã", mesmo passando só 1 minuto.
		expect(
			formatNextRun(localDate(2026, 9, 25, 0, 0).toISOString(), "pt-BR"),
		).toMatch(/^Amanhã,/);
	});

	it("formatNextRun_InvalidDate_ShouldReturnFallbackDashesNotThrow", () => {
		expect(() => formatNextRun("not-a-date", "pt-BR")).not.toThrow();
		expect(formatNextRun("not-a-date", "pt-BR")).toBe("--:--");
	});
});
