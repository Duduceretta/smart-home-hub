/**
 * Formats a UTC ISO string into a localized time string (e.g., "17:59:02").
 */
export function formatLocalTime(
	utcIsoString: string,
	locale = "pt-BR",
): string {
	try {
		const date = new Date(utcIsoString);
		return new Intl.DateTimeFormat(locale, {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		}).format(date);
	} catch {
		return "--:--:--";
	}
}

/**
 * Formats a UTC ISO string into a human-readable date group header
 * (e.g., "Hoje · 31 de Agosto", "Ontem · 30 de Agosto", "29 de Agosto").
 */
export function formatRelativeDateGroup(
	utcIsoString: string,
	locale = "pt-BR",
): string {
	try {
		const date = new Date(utcIsoString);
		const now = new Date();

		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const startOfYesterday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - 1,
		);
		const startOfEventDay = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		);

		const formattedDate = new Intl.DateTimeFormat(locale, {
			day: "numeric",
			month: "long",
		}).format(date);

		if (startOfEventDay.getTime() === startOfToday.getTime()) {
			const prefix = locale.startsWith("en") ? "Today" : "Hoje";
			return `${prefix} · ${formattedDate}`;
		}

		if (startOfEventDay.getTime() === startOfYesterday.getTime()) {
			const prefix = locale.startsWith("en") ? "Yesterday" : "Ontem";
			return `${prefix} · ${formattedDate}`;
		}

		return formattedDate;
	} catch {
		return utcIsoString;
	}
}

/**
 * Extracts the calendar day key (YYYY-MM-DD) in local time for grouping events.
 */
export function getLocalDateKey(utcIsoString: string): string {
	try {
		const date = new Date(utcIsoString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	} catch {
		return utcIsoString.substring(0, 10);
	}
}
