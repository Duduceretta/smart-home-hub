export function formatMacAddress(value: string): string {
	const clean = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
	const matches = clean.match(/.{1,2}/g);

	if (!matches) return "";
	return matches.slice(0, 6).join(":");
}

export function formatIpAddress(value: string, isDeleting = false): string {
	if (!value) return "";

	if (isDeleting) {
		return value.replace(/[^\d.]/g, "");
	}

	const clean = value.replace(/[^\d.]/g, "");
	const rawParts = clean.split(".");
	const formattedOctets: string[] = [];

	for (let i = 0; i < rawParts.length && formattedOctets.length < 4; i++) {
		const part = rawParts[i];

		if (part.length > 3) {
			let currentChunk = part.slice(0, 3);
			if (Number.parseInt(currentChunk, 10) > 255) {
				currentChunk = "255";
			}
			formattedOctets.push(currentChunk);

			const overflow = part.slice(3);
			if (overflow && formattedOctets.length < 4) {
				formattedOctets.push(overflow);
			}
		} else {
			let currentChunk = part;
			if (currentChunk) {
				const num = Number.parseInt(currentChunk, 10);
				if (num > 255) {
					currentChunk = "255";
				}
			}
			formattedOctets.push(currentChunk);
		}
	}

	let result = formattedOctets.join(".");

	if (
		clean.endsWith(".") &&
		formattedOctets.length < 4 &&
		!result.endsWith(".")
	) {
		result += ".";
	}

	const lastOctet = formattedOctets[formattedOctets.length - 1];
	if (
		lastOctet &&
		lastOctet.length === 3 &&
		formattedOctets.length < 4 &&
		!result.endsWith(".")
	) {
		result += ".";
	}

	return result;
}
