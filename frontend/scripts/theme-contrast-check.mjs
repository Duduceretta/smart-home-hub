#!/usr/bin/env node
/**
 * theme-contrast-check.mjs
 *
 * Verifica matematicamente os presets dark do design system (WCAG 2.x,
 * OKLCH, CIEDE2000 e simulação de daltonismo — deuteranopia, protanopia e
 * tritanopia, Machado 2009 — via culori). Evolução do script do Apêndice A de
 * `docs/theme-audit.md`. Além das checagens que reprovam, imprime metas
 * informativas (ΔE00 entre status e entre os `primary` de presets).
 *
 * Uso:
 *   node scripts/theme-contrast-check.mjs [arquivo] [--inventory]
 *
 *   arquivo      `.css` (default: src/app/styles/index.css) ou `.md` — no
 *                caso de Markdown, todos os blocos ```css são concatenados
 *                (ex: docs/theme-proposal.md).
 *   --inventory  imprime também a tabela de tokens (hex + OKLCH) por preset.
 *
 * Sai com código 1 se qualquer par falhar ou token obrigatório faltar.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	converter,
	differenceCiede2000,
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	filterDeficiencyTrit,
	formatHex,
	parse,
	wcagContrast,
} from "culori";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const showInventory = args.includes("--inventory");
const file = path.resolve(
	args.find((a) => !a.startsWith("--")) ??
		path.join(__dirname, "..", "src", "app", "styles", "index.css"),
);

// ── Limiares ────────────────────────────────────────────────────────────────
const TEXT_MIN = 4.5; // WCAG 1.4.3
const UI_MIN = 3; // WCAG 1.4.11
const CHART_DE_MIN = 12; // ΔE00 mínimo entre séries (normal, deuteranopia, protanopia, tritanopia)
const CHART_DE_TARGET = 15; // meta informativa
const LADDER_MAX_RATIO = 1.5; // maior degrau / menor degrau da escada de charts (não mais da superfície — ver M3 tone ladder)
// faixa de L entre success/warning/info/alert: status podem se separar por L
// (legibilidade sob daltonismo), mas continuam na mesma "banda" visual
const SEMANTIC_MAX_DL = 0.15;
const TINT = 0.15; // opacidade dos fundos sutis (`bg-x/15`)
const HOVER_ALPHA = 0.9; // `hover:bg-primary/90`
const ACTIVE_ALPHA = 0.8; // `active:bg-primary/80`

const SURFACES = ["background", "muted", "card", "popover", "surface-highest"];
// M3 tone ladder — 6 níveis (substitui a checagem antiga de ΔL≥0.08/ratio≤1.5)
const M3_SURFACES = [
	"surface-container-lowest",
	"surface",
	"surface-container-low",
	"surface-container",
	"surface-container-high",
	"surface-container-highest",
];
const SEMANTICS = ["success", "warning", "info", "alert", "destructive"];
const STATUS = ["success", "warning", "info", "alert"];
const CHARTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
// Famílias tonais M3 (tone 80/20/30/90): role / on-role / role-container / on-role-container
const TONE_FAMILIES = [
	"primary",
	"secondary",
	"tertiary",
	"error",
	"success",
	"warning",
	"info",
];
const CATEGORIES = ["lighting", "climate", "monitoring", "media", "security"];
const REQUIRED = [
	...SURFACES,
	...M3_SURFACES,
	"on-surface",
	"on-surface-variant",
	"outline",
	"outline-variant",
	"foreground",
	"card-foreground",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"on-primary",
	"primary-container",
	"on-primary-container",
	"secondary",
	"secondary-foreground",
	"on-secondary",
	"secondary-container",
	"on-secondary-container",
	"tertiary",
	"on-tertiary",
	"tertiary-container",
	"on-tertiary-container",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"destructive-foreground",
	"error",
	"on-error",
	"error-container",
	"on-error-container",
	"border",
	"border-subtle",
	"input",
	"ring",
	...CHARTS,
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
	"success",
	"success-foreground",
	"on-success",
	"success-container",
	"on-success-container",
	"warning",
	"warning-foreground",
	"on-warning",
	"warning-container",
	"on-warning-container",
	"info",
	"info-foreground",
	"on-info",
	"info-container",
	"on-info-container",
	"alert",
	"alert-foreground",
	"brand-accent",
	"brand-muted",
	...CATEGORIES,
	...CATEGORIES.flatMap((c) => [`${c}-container`, `on-${c}-container`]),
];
const THEME_INLINE_REQUIRED = [
	"--color-destructive-foreground",
	"--color-success",
	"--color-success-foreground",
	"--color-warning",
	"--color-warning-foreground",
	"--color-info",
	"--color-info-foreground",
];

// ── Leitura e parsing ───────────────────────────────────────────────────────
let css = readFileSync(file, "utf-8").replaceAll("\r\n", "\n");
if (file.endsWith(".md")) {
	css = [...css.matchAll(/```css\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
}

function blocks(source) {
	const found = [];
	const re = /([^{}]+)\{([^{}]*)\}/g;
	for (const m of source.matchAll(re)) {
		const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
		const vars = {};
		for (const d of m[2].matchAll(/--([\w-]+):\s*([^;]+);/g))
			vars[d[1]] = d[2].trim();
		found.push({ selector, vars, raw: m[2] });
	}
	return found;
}

const all = blocks(css);
const base = all.find((b) => b.selector === ".dark");
if (!base) {
	console.error(`✖ bloco .dark não encontrado em ${file}`);
	process.exit(1);
}
const presets = { teal: { ...base.vars } };
for (const b of all) {
	const m = b.selector.match(/^\.dark\[data-theme="([\w-]+)"\]$/);
	if (m) presets[m[1]] = { ...base.vars, ...b.vars };
}
const themeInline = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/)?.[1];

function resolve(vars, name, depth = 0) {
	const v = vars[name];
	if (v === undefined || depth > 8) return undefined;
	const ref = v.match(/^var\(--([\w-]+)\)$/);
	return ref ? resolve(vars, ref[1], depth + 1) : v;
}

// ── Cor ─────────────────────────────────────────────────────────────────────
const toOklch = converter("oklch");
const toRgb = converter("rgb");
const dE = differenceCiede2000();
// Machado 2009, severidade 1 (mesmas matrizes do toggle de simulação do theme-preview.html)
const VISIONS = {
	normal: (x) => x,
	deuteranopia: filterDeficiencyDeuter(1),
	protanopia: filterDeficiencyProt(1),
	tritanopia: filterDeficiencyTrit(1),
};
const L = (c) => toOklch(parse(c)).l;
const cr = (a, b) => wcagContrast(parse(a), parse(b));
/** `bg-x/NN` do Tailwind v4 composto sobre superfície opaca (alpha em sRGB). */
function over(fg, alpha, bg) {
	const a = toRgb(parse(fg));
	const b = toRgb(parse(bg));
	const mix = (k) => a[k] * alpha + b[k] * (1 - alpha);
	return formatHex({ mode: "rgb", r: mix("r"), g: mix("g"), b: mix("b") });
}
const f = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

// ── Checagens ───────────────────────────────────────────────────────────────
function checkPreset(vars) {
	const t = (name) => resolve(vars, name);
	const rows = [];
	const push = (group, label, value, ok, fmt = f(value)) =>
		rows.push({ group, label, value: fmt, ok });
	const ratio = (group, a, b, min, bHex = t(b), bLabel = b) => {
		if (!t(a) || !bHex)
			return push(group, `${a} vs ${bLabel}`, NaN, false, "ausente");
		const v = cr(t(a), bHex);
		push(group, `${a} vs ${bLabel} (≥ ${min})`, v, v >= min);
	};

	const missing = REQUIRED.filter((n) => !t(n));
	for (const n of missing)
		push("tokens", `--${n} definido`, NaN, false, "ausente");
	if (missing.some((n) => SURFACES.includes(n))) return rows;

	for (const fg of ["foreground", "muted-foreground"])
		for (const s of SURFACES) ratio("texto", fg, s, TEXT_MIN);
	ratio("texto", "card-foreground", "card", TEXT_MIN);
	ratio("texto", "popover-foreground", "popover", TEXT_MIN);
	ratio("texto", "secondary-foreground", "secondary", TEXT_MIN);
	ratio("texto", "accent-foreground", "accent", TEXT_MIN);
	ratio("texto", "sidebar-foreground", "sidebar", TEXT_MIN);
	ratio("texto", "sidebar-accent-foreground", "sidebar-accent", TEXT_MIN);

	for (const role of ["primary", ...SEMANTICS]) {
		if (!t(role)) continue;
		ratio(`${role} como texto`, role, "card", TEXT_MIN);
		ratio(`${role} como texto`, role, "popover", TEXT_MIN);
		for (const s of ["card", "popover"]) {
			const tint = over(t(role), TINT, t(s));
			ratio(
				`${role} como texto`,
				role,
				null,
				TEXT_MIN,
				tint,
				`${role}/15 sobre ${s}`,
			);
		}
	}
	for (const role of ["primary", "sidebar-primary", ...SEMANTICS])
		ratio("sólido", `${role}-foreground`, role, TEXT_MIN);
	// hover/active de botão sólido via opacidade (`hover:bg-primary/90`, `active:bg-primary/80`) sobre o tile
	for (const role of ["primary", "destructive"])
		for (const alpha of [HOVER_ALPHA, ACTIVE_ALPHA]) {
			if (!t(role)) continue;
			const bg = over(t(role), alpha, t("card"));
			ratio(
				"sólido",
				`${role}-foreground`,
				null,
				TEXT_MIN,
				bg,
				`${role}/${alpha * 100} sobre card`,
			);
		}

	ratio("bordas e foco", "border", "card", UI_MIN);
	ratio("bordas e foco", "input", "card", UI_MIN);
	ratio("bordas e foco", "ring", "background", UI_MIN);
	ratio("bordas e foco", "ring", "card", UI_MIN);
	ratio("bordas e foco", "brand-accent", "background", UI_MIN);
	if (t("border-subtle") && t("border")) {
		const a = L(t("border-subtle"));
		const b = L(t("border"));
		push(
			"bordas e foco",
			"L(border-subtle) < L(border)",
			a - b,
			a < b,
			`${f(a, 3)} < ${f(b, 3)}`,
		);
	}

	const ls = SURFACES.map((s) => L(t(s)));
	const steps = ls.slice(1).map((l, i) => l - ls[i]);
	push(
		"escada",
		"L crescente bg < muted < card < popover < highest",
		0,
		steps.every((d) => d > 0),
		steps.map((d) => f(d, 3)).join(" / "),
	);

	// M3 tone ladder: 6 níveis, cada um estritamente mais claro que o anterior
	// (substitui a antiga regra ΔL tile×página≥0.08 / ratio≤1.5 — separação de
	// card agora é degrau de tone pequeno + borda outline-variant, não um
	// salto de luminosidade isolado).
	if (M3_SURFACES.every(t)) {
		const m3ls = M3_SURFACES.map((s) => L(t(s)));
		const m3steps = m3ls.slice(1).map((l, i) => l - m3ls[i]);
		push(
			"escada m3",
			"L crescente pelos 6 níveis do tone ladder",
			0,
			m3steps.every((d) => d > 0),
			m3steps.map((d) => f(d, 3)).join(" / "),
		);
		ratio("escada m3", "outline", "surface", UI_MIN);
		ratio("escada m3", "on-surface", "surface", TEXT_MIN);
		ratio("escada m3", "on-surface-variant", "surface", TEXT_MIN);
		for (const s of M3_SURFACES) {
			ratio("escada m3", "on-surface", s, TEXT_MIN, t(s), s);
			ratio("escada m3", "on-surface-variant", s, TEXT_MIN, t(s), s);
			if (t("error")) ratio("escada m3", "error", s, TEXT_MIN, t(s), s);
		}
	}

	// Famílias tonais M3 (tone 80/20/30/90): on-role/role e
	// on-role-container/role-container ≥ 4.5:1.
	for (const role of TONE_FAMILIES) {
		if (!t(role)) continue;
		ratio("tone m3", `on-${role}`, role, TEXT_MIN);
		if (t(`${role}-container`) && t(`on-${role}-container`))
			ratio("tone m3", `on-${role}-container`, `${role}-container`, TEXT_MIN);
	}

	// Categorias: ícone (tone80) ≥ 3:1 contra surface-container.
	for (const cat of CATEGORIES) {
		if (!t(cat) || !t("surface-container")) continue;
		ratio("categorias", cat, "surface-container", UI_MIN);
		if (t(`${cat}-container`) && t(`on-${cat}-container`))
			ratio("categorias", `on-${cat}-container`, `${cat}-container`, TEXT_MIN);
	}

	if (t("accent")) {
		const a = t("accent").toLowerCase();
		const ok =
			L(a) > L(t("popover")) &&
			a !== t("card").toLowerCase() &&
			a !== t("popover").toLowerCase();
		push(
			"escada",
			"accent acima de popover (≠ card, ≠ popover)",
			L(a) - L(t("popover")),
			ok,
			`ΔL ${f(L(a) - L(t("popover")), 3)}`,
		);
	}

	const semL = STATUS.filter(t).map((n) => L(t(n)));
	if (semL.length === 4) {
		const spread = Math.max(...semL) - Math.min(...semL);
		push(
			"semânticos",
			`faixa de L dos status (spread ≤ ${SEMANTIC_MAX_DL})`,
			spread,
			spread <= SEMANTIC_MAX_DL,
			f(spread, 3),
		);
	}

	for (const c of CHARTS) if (t(c)) ratio("charts", c, "card", UI_MIN);
	if (CHARTS.every(t)) {
		const cl = CHARTS.map((c) => L(t(c)));
		const csteps = cl.slice(1).map((l, i) => l - cl[i]);
		push(
			"charts",
			"escada de L crescente chart-1 (escuro) → chart-5 (claro)",
			0,
			csteps.every((d) => d > 0),
			cl.map((l) => f(l, 3)).join(" → "),
		);
		const cr2 = Math.max(...csteps) / Math.min(...csteps);
		push(
			"charts",
			`passos de L ≈ iguais (maior/menor ≤ ${LADDER_MAX_RATIO})`,
			cr2,
			cr2 > 0 && cr2 <= LADDER_MAX_RATIO,
		);
		for (const [label, fn] of Object.entries(VISIONS)) {
			const [min, pair] = minPairDE(CHARTS.map(t), fn);
			push(
				"charts",
				`ΔE00 mínimo ${label} (≥ ${CHART_DE_MIN}; alvo ${CHART_DE_TARGET})`,
				min,
				min >= CHART_DE_MIN,
				`${f(min, 1)} (${pair})${min >= CHART_DE_TARGET ? " · alvo ✓" : ""}`,
			);
		}
	}
	return rows;
}

/** Menor ΔE00 entre qualquer par da lista sob a simulação `fn`. */
function minPairDE(colors, fn) {
	let min = Infinity;
	let pair = "";
	for (let i = 0; i < colors.length; i++)
		for (let j = i + 1; j < colors.length; j++) {
			const d = dE(fn(parse(colors[i])), fn(parse(colors[j])));
			if (d < min) [min, pair] = [d, `${i + 1}×${j + 1}`];
		}
	return [min, pair];
}

// ── Execução ────────────────────────────────────────────────────────────────
let failures = 0;
const out = [];
const w = (s = "") => out.push(s);
w(`# theme-contrast-check — ${path.relative(process.cwd(), file)}`);
w();

for (const [name, vars] of Object.entries(presets)) {
	const rows = checkPreset(vars);
	const failed = rows.filter((r) => !r.ok).length;
	failures += failed;
	w(
		`## ${name} — ${failed === 0 ? "✅ 0 falhas" : `❌ ${failed} falha(s)`} (${rows.length} checagens)`,
	);
	w();
	w("| Grupo | Checagem | Valor | |");
	w("|---|---|---|---|");
	for (const r of rows)
		w(`| ${r.group} | ${r.label} | ${r.value} | ${r.ok ? "✅" : "❌"} |`);
	w();
	if (showInventory) {
		w("| Token | Hex | L | C | H |");
		w("|---|---|---|---|---|");
		for (const n of REQUIRED) {
			const v = resolve(vars, n);
			if (!v) continue;
			const c = toOklch(parse(v));
			w(
				`| \`${n}\` | \`${formatHex(parse(v))}\` | ${f(c.l, 3)} | ${f(c.c, 3)} | ${c.c < 0.002 ? "—" : f(c.h, 1)} |`,
			);
		}
		w();
	}
}

w("## Entre presets");
w();
for (const n of ["brand-accent", "brand-muted", "primary"]) {
	const vals = Object.values(presets).map((v) => resolve(v, n)?.toLowerCase());
	const dup = vals.length - new Set(vals).size;
	if (dup > 0) failures++;
	w(
		`- \`${n}\`: ${new Set(vals).size} valor(es) distinto(s) em ${vals.length} presets ${dup ? "❌" : "✅"}`,
	);
}
if (themeInline) {
	const missing = THEME_INLINE_REQUIRED.filter(
		(v) => !themeInline.includes(`${v}:`),
	);
	failures += missing.length;
	w(
		`- \`@theme inline\`: ${missing.length ? `❌ sem ${missing.join(", ")}` : "✅ mapeia destructive-foreground e semânticos"}`,
	);
} else {
	w("- `@theme inline`: bloco não encontrado na entrada — não checado");
}
w();

// ── Metas informativas (não reprovam) ───────────────────────────────────────
w("## Metas informativas (não reprovam)");
w();
w("### ΔE00 mínimo entre status (success × warning × info × alert)");
w();
w(`| Preset | ${Object.keys(VISIONS).join(" | ")} |`);
w(
	`|---|${Object.keys(VISIONS)
		.map(() => "---")
		.join("|")}|`,
);
for (const [name, vars] of Object.entries(presets)) {
	const cols = STATUS.map((s) => resolve(vars, s));
	if (cols.some((c) => !c)) {
		w(
			`| ${name} | ${Object.keys(VISIONS)
				.map(() => "—")
				.join(" | ")} |`,
		);
		continue;
	}
	const cells = Object.values(VISIONS).map((fn) => {
		const [min, pair] = minPairDE(cols, fn);
		const [a, b] = pair.split("×").map((i) => STATUS[i - 1]);
		return `${f(min, 1)} (${a}×${b})`;
	});
	w(`| ${name} | ${cells.join(" | ")} |`);
}
w();
w("### ΔE00 entre os `primary` de presets diferentes");
w();
w(
	"_Report-only — não reprova build. Só um preset fica ativo por vez; presets nunca aparecem lado a lado. Sem piso mínimo (decisão do usuário, 2026-09-23)._",
);
w();
const names = Object.keys(presets);
w(`| Par | ${Object.keys(VISIONS).join(" | ")} |`);
w(
	`|---|${Object.keys(VISIONS)
		.map(() => "---")
		.join("|")}|`,
);
const worst = Object.fromEntries(
	Object.keys(VISIONS).map((k) => [k, Infinity]),
);
for (let i = 0; i < names.length; i++)
	for (let j = i + 1; j < names.length; j++) {
		const a = resolve(presets[names[i]], "primary");
		const b = resolve(presets[names[j]], "primary");
		const cells = Object.entries(VISIONS).map(([k, fn]) => {
			const d = dE(fn(parse(a)), fn(parse(b)));
			worst[k] = Math.min(worst[k], d);
			return f(d, 1);
		});
		w(`| ${names[i]} × ${names[j]} | ${cells.join(" | ")} |`);
	}
w(
	`| **mínimo** | ${Object.values(worst)
		.map((v) => `**${f(v, 1)}**`)
		.join(" | ")} |`,
);
w();
w(failures === 0 ? "**✅ 0 falhas.**" : `**❌ ${failures} falha(s).**`);

console.log(out.join("\n"));
process.exit(failures === 0 ? 0 : 1);
