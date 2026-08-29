export function getRelativeTime(
	utcTimestamp: string,
	locale: string,
	justNowLabel: string,
): string {
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	const elapsedSeconds = (new Date(utcTimestamp).getTime() - Date.now()) / 1000;

	if (Math.abs(elapsedSeconds) < 60) return justNowLabel;
	const elapsedMinutes = Math.round(elapsedSeconds / 60);
	if (Math.abs(elapsedMinutes) < 60)
		return rtf.format(elapsedMinutes, "minute");
	const elapsedHours = Math.round(elapsedMinutes / 60);
	if (Math.abs(elapsedHours) < 24) return rtf.format(elapsedHours, "hour");
	const elapsedDays = Math.round(elapsedHours / 24);
	return rtf.format(elapsedDays, "day");
}
