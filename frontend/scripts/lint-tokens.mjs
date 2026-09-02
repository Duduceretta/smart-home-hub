#!/usr/bin/env node
/**
 * lint-tokens.mjs
 *
 * Bloqueia regressão de tokens de design: hex cru e classes Tailwind de
 * cor bruta fora do design system (fora de src/app/styles/).
 *
 * Exceção por linha: comentário `// design-token-lint-ignore` na mesma
 * linha ou na linha imediatamente anterior.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "..", "src");

const EXCLUDED_DIRS = new Set(["node_modules", "dist"]);
const EXCLUDED_PATH_SEGMENTS = [
	path.join("src", "app", "styles") + path.sep,
];

const IGNORE_COMMENT = "design-token-lint-ignore";

// Paletas Tailwind brutas com equivalente semântico no design system
// (confirmado contra src/app/styles/index.css e uso real no código:
// zinc/indigo/slate = superfícies e cores de tema; red = --alert).
const RAW_COLOR_PALETTES = ["zinc", "indigo", "slate", "red"];
const RAW_COLOR_PREFIXES = ["bg", "text", "border"];

const rawTailwindClassRegex = new RegExp(
	`\\b(?:${RAW_COLOR_PREFIXES.join("|")})-(?:${RAW_COLOR_PALETTES.join("|")})-\\d{2,3}\\b`,
);

const rawHexColorRegex = /#[0-9a-fA-F]{3,8}\b/;

function isExcludedFile(filePath) {
	const normalized = filePath;
	for (const segment of EXCLUDED_PATH_SEGMENTS) {
		if (normalized.includes(segment)) return true;
	}
	return false;
}

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		if (EXCLUDED_DIRS.has(entry)) continue;
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			walk(fullPath, files);
		} else if (/\.(ts|tsx)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function findViolationsInFile(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");
	const violations = [];

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		const currentLineHasIgnore = line.includes(IGNORE_COMMENT);
		const previousLineHasIgnore =
			index > 0 && lines[index - 1].includes(IGNORE_COMMENT);

		if (currentLineHasIgnore || previousLineHasIgnore) return;

		const hexMatch = line.match(rawHexColorRegex);
		if (hexMatch) {
			violations.push({
				line: lineNumber,
				snippet: line.trim(),
				reason: `hex cru (${hexMatch[0]})`,
			});
			return;
		}

		const classMatch = line.match(rawTailwindClassRegex);
		if (classMatch) {
			violations.push({
				line: lineNumber,
				snippet: line.trim(),
				reason: `classe Tailwind bruta (${classMatch[0]})`,
			});
		}
	});

	return violations;
}

function main() {
	const files = walk(SRC_ROOT).filter((file) => !isExcludedFile(file));

	let totalViolations = 0;

	for (const filePath of files) {
		const relativePath = path.relative(
			path.resolve(__dirname, ".."),
			filePath,
		);
		const violations = findViolationsInFile(filePath);

		for (const violation of violations) {
			totalViolations++;
			console.error(
				`${relativePath}:${violation.line} — ${violation.reason} — ${violation.snippet}`,
			);
		}
	}

	if (totalViolations > 0) {
		console.error(
			`\n✖ lint:tokens — ${totalViolations} violação(ões) de token de design encontrada(s).`,
		);
		console.error(
			`  Use classes/tokens semânticos do design system, ou "// ${IGNORE_COMMENT}" para exceções legítimas (ex: cores de marca de terceiros).`,
		);
		process.exit(1);
	}

	console.log("✔ lint:tokens — nenhuma regressão de token de design encontrada.");
	process.exit(0);
}

main();
