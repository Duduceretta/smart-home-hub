/**
 * Converte HSV (H 0-360, S/V 0-1) pra hex "#RRGGBB" — usado pela
 * `ColorWheel` pra transformar a posição do toque/arraste (ângulo=matiz,
 * raio=saturação) num valor que a API já aceita (`PUT .../color`).
 */
export function hsvToHex(h: number, s: number, v: number): string {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h < 60) [r, g, b] = [c, x, 0];
	else if (h < 120) [r, g, b] = [x, c, 0];
	else if (h < 180) [r, g, b] = [0, c, x];
	else if (h < 240) [r, g, b] = [0, x, c];
	else if (h < 300) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];

	const toHex = (n: number) =>
		Math.round((n + m) * 255)
			.toString(16)
			.padStart(2, "0");

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Converte hex "#RRGGBB" pra HSV (H 0-360, S/V 0-1) — inverso de `hsvToHex`,
 * usado pela `ColorWheel` pra reposicionar o thumb a partir da cor real
 * persistida (`device.colorHex`) em vez de sempre nascer no vermelho (H=0).
 */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
	const normalized = hex.replace("#", "");
	const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
	const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
	const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === r) h = 60 * (((g - b) / delta) % 6);
		else if (max === g) h = 60 * ((b - r) / delta + 2);
		else h = 60 * ((r - g) / delta + 4);
	}
	if (h < 0) h += 360;

	const v = max;
	const s = max === 0 ? 0 : delta / max;

	return { h, s, v };
}
