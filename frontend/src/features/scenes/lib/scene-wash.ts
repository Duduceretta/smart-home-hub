/** Valor do enum `DeviceType` do backend para luz. */
const DEVICE_TYPE_LIGHT = 1;

/** No máximo 3 cores por cena: mais que isso vira ruído visual. */
const MAX_LAYERS = 3;

/** Âncoras das manchas — espalhadas pelo card para a luz parecer vir de pontos diferentes. */
const LAYER_ANCHORS = ["18% 12%", "84% 22%", "52% 94%"] as const;

export interface SceneWashItem {
	deviceType: number;
	isOn: boolean;
	brightness: number | null;
	colorHex: string | null;
}

interface WashTone {
	color: string;
	percent: number;
	priority: number;
}

/**
 * Cor "de luz" de um dispositivo que a cena liga: a cor própria da luz quando existe,
 * o token `--warm` para luz sem cor definida e `--primary` para o resto. Os tokens vêm do
 * tema ativo (nunca uma cor fixa do Tailwind); `colorHex` é dado do usuário, não token de
 * design. `null` quando o item desliga o dispositivo.
 */
export function sceneItemTone(
	item: Pick<SceneWashItem, "deviceType" | "isOn" | "colorHex">,
): string | null {
	if (!item.isOn) return null;

	return (
		item.colorHex ??
		(item.deviceType === DEVICE_TYPE_LIGHT ? "var(--warm)" : "var(--primary)")
	);
}

function toneOf(item: SceneWashItem): WashTone | null {
	const color = sceneItemTone(item);
	if (!color) return null;

	const isLight = item.deviceType === DEVICE_TYPE_LIGHT;
	// Luz com cor própria é a mais expressiva, depois luz comum, depois o resto.
	const priority = item.colorHex ? 0 : isLight ? 1 : 2;
	// Brilho 0-100 vira intensidade 26-60%: nem some quando fraca, nem estoura quando forte.
	const percent = Math.round(26 + (34 * (item.brightness ?? 100)) / 100);

	return { color, percent, priority };
}

/**
 * Cores distintas que a cena acende, das mais expressivas para as menos, até o limite.
 * Quando a mesma cor aparece em vários dispositivos vale a de maior intensidade.
 */
function collectTones(items: SceneWashItem[]): WashTone[] {
	const byColor = new Map<string, WashTone>();

	for (const tone of items
		.map(toneOf)
		.filter((value): value is WashTone => value !== null)
		.sort((a, b) => a.priority - b.priority)) {
		const known = byColor.get(tone.color);
		if (!known || tone.percent > known.percent) {
			byColor.set(tone.color, tone);
		}
	}

	return [...byColor.values()].slice(0, MAX_LAYERS);
}

/**
 * Monta o `background-image` do "light wash" de uma cena: manchas radiais
 * derivadas das luzes que ela liga, como se o card estivesse iluminado pela
 * própria cena. Devolve string vazia quando nada liga (cena que só apaga).
 */
export function buildSceneWash(items: SceneWashItem[]): string {
	return collectTones(items)
		.map(
			(tone, index) =>
				`radial-gradient(circle at ${LAYER_ANCHORS[index]}, color-mix(in oklab, ${tone.color} ${tone.percent}%, transparent) 0%, transparent 62%)`,
		)
		.join(", ");
}

/**
 * Faixa de luz horizontal de uma cena (a "fita de LED" da lista): um gradiente linear
 * com as cores que ela acende. Com uma cor só, repete a cor para formar um gradiente
 * válido. Devolve string vazia quando nada liga.
 */
export function buildSceneStrip(items: SceneWashItem[]): string {
	const colors = collectTones(items).map((tone) => tone.color);
	if (colors.length === 0) return "";

	const stops = colors.length === 1 ? [colors[0], colors[0]] : colors;

	return `linear-gradient(90deg, ${stops
		.map((color) => `color-mix(in oklab, ${color} 78%, transparent)`)
		.join(", ")})`;
}

/**
 * "Brilho residual" de uma cena que só apaga (ex: Boa Noite): em vez de um cartão
 * chapado, uma luz fraca subindo da base, como o último reflexo de um ambiente que
 * acabou de escurecer. Só token do tema, nunca cor fixa.
 */
export const SCENE_AFTERGLOW =
	"radial-gradient(ellipse at 50% 125%, color-mix(in oklab, var(--primary) 16%, transparent) 0%, transparent 70%)";

/**
 * Fundo de uma cena: o light wash quando ela acende algo; o brilho residual quando só
 * apaga; nada quando não tem item algum.
 */
export function buildSceneBackdrop(items: SceneWashItem[]): string {
	if (items.length === 0) return "";

	return buildSceneWash(items) || SCENE_AFTERGLOW;
}
