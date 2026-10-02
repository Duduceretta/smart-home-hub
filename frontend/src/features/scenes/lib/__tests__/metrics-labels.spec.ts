import { describe, expect, it } from "vitest";
import { lastDaysLabels } from "../metrics-labels";

// 2026-10-01 é uma quinta-feira.
const THURSDAY = new Date("2026-10-01T12:00:00").getTime();

describe("lastDaysLabels", () => {
	it("lastDaysLabels_Seven_ShouldEndTodayAndGoBackSixDays", () => {
		expect(lastDaysLabels(7, "pt-BR", THURSDAY)).toEqual([
			"sex.",
			"sáb.",
			"dom.",
			"seg.",
			"ter.",
			"qua.",
			"qui.",
		]);
	});

	it("lastDaysLabels_EnglishLocale_ShouldUseEnglishWeekdays", () => {
		expect(lastDaysLabels(3, "en-US", THURSDAY)).toEqual(["Tue", "Wed", "Thu"]);
	});

	it("lastDaysLabels_One_ShouldBeJustToday", () => {
		expect(lastDaysLabels(1, "pt-BR", THURSDAY)).toEqual(["qui."]);
	});
});
