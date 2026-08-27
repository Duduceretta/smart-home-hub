/**
 * Formatação relativa compacta ("há 3h", "há 2d") sem trazer date-fns só
 * pra isso — o projeto não tem essa dependência ainda e o caso de uso aqui
 * é simples o suficiente pra não justificá-la.
 */
export function formatRelativeTime(iso: string | null): string {
	if (!iso) return "Nunca executada";

	const diffMs = Date.now() - new Date(iso).getTime();
	const diffMinutes = Math.floor(diffMs / (60 * 1000));

	if (diffMinutes < 1) return "Agora mesmo";
	if (diffMinutes < 60) return `Há ${diffMinutes}min`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `Há ${diffHours}h`;

	const diffDays = Math.floor(diffHours / 24);
	return `Há ${diffDays}d`;
}
