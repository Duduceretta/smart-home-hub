/**
 * Formata a próxima execução de uma automação com rótulo relativo de dia +
 * hora absoluta local — "Hoje, 23:00" / "Amanhã, 07:00" / "Sexta-feira, 08:00".
 *
 * Mesma convenção usada em `features/history/utils/formatHistoryDate.ts`
 * (`formatRelativeDateGroup`, "Hoje · ..."/"Ontem · ..."), só espelhada pra
 * frente no tempo em vez de pra trás — `HH:mm` sozinho seria ambíguo pra um
 * cron que só dispara dias depois (ex: automação semanal de sexta), então o
 * rótulo de dia nunca é opcional.
 */
export function formatNextRun(
	nextRunUtcIso: string,
	locale: string = "pt-BR",
): string {
	const date = new Date(nextRunUtcIso);
	if (Number.isNaN(date.getTime())) {
		return "--:--";
	}

	const now = new Date();

	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const startOfToday = startOfDay(now);
	const startOfTomorrow = new Date(startOfToday);
	startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
	const startOfTarget = startOfDay(date);

	const time = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);

	let dayLabel: string;
	if (startOfTarget.getTime() === startOfToday.getTime()) {
		dayLabel = locale.startsWith("en") ? "Today" : "Hoje";
	} else if (startOfTarget.getTime() === startOfTomorrow.getTime()) {
		dayLabel = locale.startsWith("en") ? "Tomorrow" : "Amanhã";
	} else {
		const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
			date,
		);
		dayLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);
	}

	return `${dayLabel}, ${time}`;
}
