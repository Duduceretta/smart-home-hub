const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rótulos curtos de dia da semana para o gráfico de ativações: os últimos `count` dias,
 * do mais antigo para hoje (a mesma ordem de `SceneMetrics.activationsPerDay`).
 * `now` existe para os testes não dependerem do relógio.
 */
export function lastDaysLabels(
	count: number,
	locale: string,
	now: number = Date.now(),
): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

	return Array.from({ length: count }, (_, index) =>
		formatter.format(new Date(now - (count - 1 - index) * DAY_MS)),
	);
}
