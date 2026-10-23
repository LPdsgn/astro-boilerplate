#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseThemeCss, parseTailwindCss, parseTypographyCss } from './parse-css';
import { emitTokensStudio } from './emit-tokens-studio';
import { buildResolver } from './resolve';
import { readFontConfig } from './font-config';
import type { ParsedTokens, Resolver } from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..', '..');
const THEME_CSS = resolve(REPO_ROOT, 'src/styles/theme.css');
const TAILWIND_CSS = resolve(REPO_ROOT, 'src/styles/tailwind.css');
const TYPOGRAPHY_CSS = resolve(REPO_ROOT, 'src/styles/typography.css');
const TOKENS_JSON = resolve(REPO_ROOT, 'tokens.json');

function merge(...parts: ParsedTokens[]): ParsedTokens {
	return {
		primitives: parts.flatMap((p) => p.primitives),
		semanticColors: parts.flatMap((p) => p.semanticColors),
		fluidTokens: parts.flatMap((p) => p.fluidTokens),
		scalarTokens: parts.flatMap((p) => p.scalarTokens),
		typography: parts.flatMap((p) => p.typography),
	};
}

export function buildTokensJson(): string {
	const themeContent = readFileSync(THEME_CSS, 'utf-8');
	const tailwindContent = readFileSync(TAILWIND_CSS, 'utf-8');
	const typographyContent = readFileSync(TYPOGRAPHY_CSS, 'utf-8');

	const baseResolver = buildResolver({
		theme: themeContent,
		tailwind: tailwindContent,
		typography: typographyContent,
	});

	// Wrap baseResolver to add font lookup from astro.config.ts
	const fonts = readFontConfig(REPO_ROOT);
	const resolver: Resolver = {
		resolve: baseResolver.resolve.bind(baseResolver),
		resolveFluid: baseResolver.resolveFluid.bind(baseResolver),
		getFont: (varName) => fonts.get(varName) ?? null,
	};

	const parsed = merge(
		parseThemeCss(themeContent, resolver),
		parseTailwindCss(tailwindContent, resolver),
		parseTypographyCss(typographyContent, resolver)
	);

	// Emit font.family.<localname> tokens directly from astro.config.ts fonts config.
	for (const [varName, family] of fonts) {
		const local = varName.replace(/^--font-/, '');
		parsed.scalarTokens.push({
			path: ['font', 'family', local],
			type: 'fontFamilies',
			value: family,
		});
	}

	return emitTokensStudio(parsed);
}

function main() {
	const args = process.argv.slice(2);
	const checkMode = args.includes('--check');

	const generated = buildTokensJson();

	if (checkMode) {
		let committed = '';
		try {
			committed = readFileSync(TOKENS_JSON, 'utf-8');
		} catch (err) {
			console.error(
				`tokens:check — tokens.json not found at ${TOKENS_JSON}. Run \`pnpm tokens:build\` first.`
			);
			process.exit(1);
		}
		if (committed === generated) {
			console.log('tokens:check — tokens.json is in sync with CSS sources.');
			return;
		}
		console.error(
			'tokens:check — tokens.json is out of date with src/styles/{theme,tailwind,typography}.css.'
		);
		console.error('Run: pnpm tokens:build');
		console.error('');
		const committedLines = committed.split('\n');
		const generatedLines = generated.split('\n');
		const maxLines = Math.max(committedLines.length, generatedLines.length);
		let shown = 0;
		for (let i = 0; i < maxLines && shown < 20; i++) {
			if (committedLines[i] !== generatedLines[i]) {
				console.error(`Line ${i + 1}:`);
				console.error(`  - committed: ${JSON.stringify(committedLines[i] ?? '<EOF>')}`);
				console.error(`  + generated: ${JSON.stringify(generatedLines[i] ?? '<EOF>')}`);
				shown++;
			}
		}
		process.exit(1);
	}

	writeFileSync(TOKENS_JSON, generated, 'utf-8');
	console.log(`tokens:build — wrote ${TOKENS_JSON}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
