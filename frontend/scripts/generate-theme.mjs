import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { BackgroundColor, Color, Theme } from "@adobe/leonardo-contrast-colors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THEME_PRESETS = {
	// 0. Super Black / OLED (Preto Puro + Alto Contraste para Acessibilidade)
	oled: {
		name: "Super Black OLED (Preto Absoluto / Alto Contraste)",
		background: "#000000",
		// Chaves com salto nítido para destacar os cards
		keys: ["#222222", "#888888", "#ffffff"],
		primary: "#38bdf8",
		primaryFg: "#000000",
		borderSubtleDelta: 2.0,
	},
	// 1. Azul Slate Moderno (Estilo Vercel / Linear)
	slate: {
		name: "Midnight Slate (Azulado Técnico)",
		background: "#0f172a",
		keys: ["#1e293b", "#64748b", "#f8fafc"],
		primary: "#93c5fd",
		primaryFg: "#0f172a",
		borderSubtleDelta: 1.4,
	},
	// 2. Grafite Quente / Carvão Suave (Estilo Raycast / Apple)
	warm: {
		name: "Warm Obsidian (Grafite Quente)",
		background: "#181719",
		keys: ["#232225", "#807b82", "#f5f2f4"],
		primary: "#d6d7e0",
		primaryFg: "#1c1b1f",
		borderSubtleDelta: 1.45,
	},
	// 3. Verde Esmeralda Noturno (Monitoramento & Energia)
	emerald: {
		name: "Pine / Emerald (Monitoramento & Energia)",
		background: "#0b1614",
		keys: ["#132824", "#4e7d73", "#e6f4f1"],
		primary: "#6ee7b7",
		primaryFg: "#06231a",
		borderSubtleDelta: 1.45,
	},
	// 4. Deep Violet (Moderno & Sofisticado)
	violet: {
		name: "Deep Violet (Moderno & Sofisticado)",
		background: "#120e1c",
		keys: ["#1e182e", "#70638e", "#f3effa"],
		primary: "#c4b5fd",
		primaryFg: "#1e1335",
		borderSubtleDelta: 1.45,
	},
};

const chosenKey = process.argv[2]?.toLowerCase() || "oled";
const preset = THEME_PRESETS[chosenKey] || THEME_PRESETS.oled;

console.log(`\n🚀 Gerando tema: ${preset.name}...\n`);

const darkBg = new BackgroundColor({
	name: "background",
	colorKeys: [preset.background],
});

const surfaceColor = new Color({
	name: "surface",
	colorKeys: preset.keys,
	space: "RGB",
	ratios: [
		1.25, // surface-low (sidebar)
		1.55, // card
		2.0, // popover/modal
		2.6, // surface-highest (hover)
		preset.borderSubtleDelta, // border-subtle
		3.2, // border (nítido)
		4.0, // input
		7.0, // muted-foreground (alto contraste)
		16.0, // foreground (branco nítido)
	],
});

const theme = new Theme({
	colors: [surfaceColor],
	backgroundColor: darkBg,
	lightness: 10,
	contrast: 1,
});

const rawValues = theme.contrastColorValues || [];
const values = rawValues.filter(
	(hex) => hex.toLowerCase() !== preset.background.toLowerCase(),
);

const tokens = {
	background: preset.background,
	surfaceLow: values[0],
	card: values[1],
	popover: values[2],
	surfaceHighest: values[3],
	borderSubtle: values[4],
	border: values[5],
	input: values[6],
	mutedForeground: values[7],
	foreground: values[8],
};

console.table(tokens);

const targetCssPath = path.resolve(__dirname, "../src/app/styles/index.css");

if (!fs.existsSync(targetCssPath)) {
	console.error(`❌ Não foi possível encontrar o arquivo em: ${targetCssPath}`);
	process.exit(1);
}

const newDarkBlock = `.dark {
    color-scheme: dark;

    --background: ${tokens.background};
    --foreground: ${tokens.foreground};

    /* Elevação nítida: Cards e containers bem destacados */
    --card: ${tokens.card};
    --card-foreground: ${tokens.foreground};

    --popover: ${tokens.popover};
    --popover-foreground: ${tokens.foreground};

    --primary: ${preset.primary};
    --primary-foreground: ${preset.primaryFg};

    --secondary: ${tokens.popover};
    --secondary-foreground: ${tokens.foreground};

    --muted: ${tokens.surfaceLow};
    --muted-foreground: ${tokens.mutedForeground};

    --accent: ${tokens.surfaceLow};
    --accent-foreground: ${tokens.foreground};

    --destructive: #ffb4ab;

    /* Bordas de alto contraste para separar os blocos com clareza */
    --border-subtle: ${tokens.borderSubtle};
    --border: ${tokens.border};
    --input: ${tokens.input};
    --ring: ${preset.primary};

    --chart-1: ${preset.primary};
    --chart-2: #38bdf8;
    --chart-3: #a78bfa;
    --chart-4: #4ade80;
    --chart-5: #f43f5e;
    --radius: 0.75rem;

    --sidebar: ${tokens.surfaceLow};
    --sidebar-foreground: ${tokens.foreground};
    --sidebar-primary: ${preset.primary};
    --sidebar-primary-foreground: ${preset.primaryFg};
    --sidebar-accent: ${tokens.card};
    --sidebar-accent-foreground: ${tokens.foreground};
    --sidebar-border: ${tokens.borderSubtle};
    --sidebar-ring: ${preset.primary};

    --surface-highest: ${tokens.surfaceHighest};
    --warm: #d3c4b8;
    --warm-foreground: #382f27;
    --alert: #93000a;
    --alert-foreground: #ffb4ab;
}`;

let cssContent = fs.readFileSync(targetCssPath, "utf-8");
const darkRegex = /\.dark\s*\{[\s\S]*?\n\}/;

if (darkRegex.test(cssContent)) {
	cssContent = cssContent.replace(darkRegex, newDarkBlock);
	fs.writeFileSync(targetCssPath, cssContent, "utf-8");
	console.log(`✨ Tema aplicado com sucesso no index.css!\n`);
}
