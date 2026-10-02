const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Texto relativo da última ativação de uma cena ("há 2 horas", "ontem", "agora").
 * Devolve `null` para cena nunca ativada ou data inválida — quem chama decide o
 * texto de "nunca ativada". `now` existe para os testes não dependerem do relógio.
 */
export function formatLastActivation(
	iso: string | null,
	locale: string,
	now: number = Date.now(),
): string | null {
	if (!iso) return null;

	const timestamp = new Date(iso).getTime();
	if (Number.isNaN(timestamp)) return null;

	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	// Relógio do servidor um pouco à frente do cliente não pode virar "daqui a 30 s".
	const elapsed = Math.max(0, now - timestamp);

	if (elapsed < 45 * SECOND) return formatter.format(0, "second");
	if (elapsed < HOUR) {
		return formatter.format(
			-Math.max(1, Math.round(elapsed / MINUTE)),
			"minute",
		);
	}
	if (elapsed < DAY) {
		return formatter.format(-Math.round(elapsed / HOUR), "hour");
	}

	const days = Math.floor(elapsed / DAY);
	if (days < 30) return formatter.format(-days, "day");

	return formatter.format(-Math.floor(days / 30), "month");
}
