/**
 * Mesma lógica de `rooms/lib/get-relative-time.ts`, duplicada localmente
 * (isolamento do FSD) — pequena e estável o bastante pra não valer um
 * componente/util compartilhado em `core/`.
 */
export function getRelativeTime(utcTimestamp: string): string {
	const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
	const elapsedSeconds = (new Date(utcTimestamp).getTime() - Date.now()) / 1000;

	if (Math.abs(elapsedSeconds) < 60) return "Agora mesmo";
	const elapsedMinutes = Math.round(elapsedSeconds / 60);
	if (Math.abs(elapsedMinutes) < 60)
		return rtf.format(elapsedMinutes, "minute");
	const elapsedHours = Math.round(elapsedMinutes / 60);
	if (Math.abs(elapsedHours) < 24) return rtf.format(elapsedHours, "hour");
	const elapsedDays = Math.round(elapsedHours / 24);
	return rtf.format(elapsedDays, "day");
}
