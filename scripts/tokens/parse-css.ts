import type {
	ColorPrimitive,
	FluidToken,
	FluidTokenType,
	ParsedTokens,
	Resolver,
	ScalarToken,
	SemanticColor,
	TokenType,
	TypographyEntry,
} from './schema';
import { hslChannelTupleToHex } from './color';
import { interpolateClamp } from './utopia';
import { evaluateCalc } from './calc';

// Color primitive prefixes — names that, after stripping prefix-N, become path[0]=prefix path[1]=N.
const PRIMITIVE_PREFIXES = ['dark', 'light', 'primary', 'error', 'success', 'warning'] as const;

// CSS variable names that are computation seeds for other tokens — never emitted.
const SKIP_VARS = new Set(['spacing', 'radius']);

const TAILWIND_PALETTE_RE = /^hsl\s*\(\s*var\s*\(\s*--color-/i;
const REDUNDANT_COLOR_VARS = new Set(['color-black', 'color-white']);

// Animation token names: durations + easings. Suppressed from tokens.json because
// Figma cannot meaningfully represent CSS animations (prototyping doesn't accept
// variables for interaction timing).
const ANIMATION_NAMES = new Set([
	'ease',
	'transition-duration',
	'theme-transition-duration',
	'theme-transition-easing',
]);

function isAnimationToken(name: string): boolean {
	if (ANIMATION_NAMES.has(name)) return true;
	for (const prefix of ANIMATION_NAMES) {
		if (name.startsWith(`${prefix}-`)) return true;
	}
	return false;
}

function isRedundantColorVar(name: string): boolean {
	return REDUNDANT_COLOR_VARS.has(name);
}

function isTailwindPaletteRef(value: string): boolean {
	return TAILWIND_PALETTE_RE.test(value);
}

// Variables whose name starts with these prefixes are routed to scalar tokens under the prefix.
const SCALAR_PREFIX_TO_TYPE: Record<string, TokenType> = {
	breakpoint: 'sizing',
	'transition-duration': 'duration',
	'z-index': 'number',
	tracking: 'letterSpacing',
	leading: 'lineHeights',
	'font-weight': 'fontWeights',
	aspect: 'other',
};

// Variables routed to fluid tokens under their prefix.
const FLUID_PREFIX_TO_TYPE: Record<string, FluidTokenType> = {
	spacing: 'spacing',
	text: 'sizing',
	radius: 'borderRadius',
	container: 'sizing',
	header: 'sizing',
};

// Spacing one-up pair names — both halves are size tiers (e.g. `2xs-xs`, `md-lg`).
const SPACING_PAIR_RE = /^(?:[234]?xs|sm|md|lg|xl|[234]xl)-(?:[234]?xs|sm|md|lg|xl|[234]xl)$/;

// Container fraction suffixes — `--spacing-whole`, `--spacing-half`, etc. route to
// `responsive/container/<name>` instead of `responsive/spacing/<name>`. Uses the
// Tailwind `--spacing-*` namespace so `w-whole`, `p-half`, etc. utilities are
// generated automatically.
const CONTAINER_FRACTION_NAMES = new Set([
	'whole',
	'half',
	'third',
	'quarter',
	'two-thirds',
	'three-quarters',
	'whole-half',
	'whole-third',
	'whole-quarter',
	'whole-two-thirds',
	'whole-three-quarters',
]);

// font/* sub-groups → their TokenType. Looked up by path[1] when path[0] === 'font'.
const FONT_SUBGROUP_TO_TYPE: Record<string, TokenType> = {
	tracking: 'letterSpacing',
	leading: 'lineHeights',
	'font-weight': 'fontWeights',
	family: 'fontFamilies',
};

function scalarTypeFor(path: string[]): TokenType | null {
	if (path[0] === 'font' && path.length >= 2) {
		return FONT_SUBGROUP_TO_TYPE[path[1]] ?? null;
	}
	return SCALAR_PREFIX_TO_TYPE[path[0]] ?? null;
}

interface RawDeclaration {
	name: string; // without leading "--"
	value: string;
}

function extractBlock(content: string, header: RegExp): string | null {
	// Strip CSS block comments before brace-counting so that a `/* ... } ... */`
	// inside a block doesn't prematurely close the depth counter. Comments are
	// replaced with an empty string globally; all downstream parsing (header
	// match, declaration extraction) operates on the comment-free source.
	const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
	const match = stripped.match(header);
	if (!match) return null;
	const startIndex = (match.index ?? 0) + match[0].length;
	let depth = 1;
	let i = startIndex;
	while (i < stripped.length && depth > 0) {
		const c = stripped[i];
		if (c === '{') depth++;
		else if (c === '}') depth--;
		i++;
	}
	return stripped.slice(startIndex, i - 1);
}

function extractDeclarations(blockBody: string): RawDeclaration[] {
	const declarations: RawDeclaration[] = [];
	const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(blockBody)) !== null) {
		declarations.push({ name: match[1], value: match[2].trim() });
	}
	return declarations;
}

function isHslAlias(value: string): boolean {
	return /^hsl\s*\(/i.test(value);
}

function isVarOrCalc(value: string): boolean {
	return /^(var|calc)\s*\(/i.test(value);
}

function isUtopiaClamp(value: string): { min: number; max: number } | null {
	const match = value.match(
		/^utopia\.clamp\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i
	);
	if (!match) return null;
	return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

function parseHslAlias(value: string): string {
	const inner = value.replace(/^hsl\s*\(/i, '').replace(/\)\s*$/, '');
	const normalized = inner.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
	return hslChannelTupleToHex(normalized);
}

function normalizeDuration(value: string): string {
	const match = value.trim().match(/^(\d+(?:\.\d+)?)(s|ms)$/);
	if (!match) return value;
	const num = parseFloat(match[1]);
	const unit = match[2];
	const ms = unit === 's' ? num * 1000 : num;
	return `${ms}ms`;
}

function pathFromName(name: string): string[] | null {
	if (name === 'black' || name === 'white') return [name];
	// Color primitives nest under `color/<prefix>/<shade>`.
	for (const prefix of PRIMITIVE_PREFIXES) {
		if (name.startsWith(`${prefix}-`)) {
			const shade = name.slice(prefix.length + 1);
			return ['color', prefix, shade];
		}
	}
	// --spacing-header is a top-level layout token (not a spacing tier).
	if (name === 'spacing-header') return ['header'];
	if (name.startsWith('spacing-')) {
		const rest = name.slice('spacing-'.length);
		// Container fractions live under responsive/container/<name>, sharing the
		// Tailwind --spacing-* namespace so width/padding/margin utilities work.
		if (CONTAINER_FRACTION_NAMES.has(rest)) return ['container', rest];
		// One-up spacing pairs (e.g. `--spacing-2xs-xs`) nest under spacing/pairs.
		if (SPACING_PAIR_RE.test(rest)) return ['spacing', 'pairs', rest];
	}
	if (name.startsWith('spacing-v-')) {
		return ['spacing', 'v', name.slice('spacing-v-'.length)];
	}
	if (name.startsWith('spacing-fluid-')) {
		return ['spacing', 'fluid', name.slice('spacing-fluid-'.length)];
	}
	// Font scalars consolidated under core.font.<sub>.<rest>.
	for (const compound of ['font-weight', 'tracking', 'leading']) {
		if (name === compound) return ['font', compound, 'default'];
		if (name.startsWith(`${compound}-`)) {
			return ['font', compound, name.slice(compound.length + 1)];
		}
	}
	// Other compound prefixes
	for (const compound of ['transition-duration', 'z-index']) {
		if (name === compound) return [compound, 'default'];
		if (name.startsWith(`${compound}-`)) {
			return [compound, name.slice(compound.length + 1)];
		}
	}
	const dashIndex = name.indexOf('-');
	if (dashIndex > 0) {
		const prefix = name.slice(0, dashIndex);
		const rest = name.slice(dashIndex + 1);
		return [prefix, rest];
	}
	if (name in SCALAR_PREFIX_TO_TYPE) return [name, 'default'];
	if (name === 'ease') return ['ease'];
	return [name];
}

export function parseThemeCss(content: string, resolver?: Resolver): ParsedTokens {
	const primitives: ColorPrimitive[] = [];
	const semanticColors: SemanticColor[] = [];
	const fluidTokens: FluidToken[] = [];
	const scalarTokens: ScalarToken[] = [];
	const typography: TypographyEntry[] = [];

	const rootBlock = extractBlock(content, /:root\s*\{/);
	if (rootBlock) {
		for (const { name, value } of extractDeclarations(rootBlock)) {
			if (SKIP_VARS.has(name)) continue;
			const path = pathFromName(name);
			if (!path) continue;
			if (isHslAlias(value) || isVarOrCalc(value)) continue;
			const isHslTuple = /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%/.test(value);
			if (isHslTuple) {
				const isPrimitive =
					PRIMITIVE_PREFIXES.some((p) => name.startsWith(`${p}-`)) ||
					name === 'black' ||
					name === 'white';
				if (isPrimitive) {
					primitives.push({ path, hex: hslChannelTupleToHex(value) });
				}
				continue;
			}
			console.warn(
				`[tokens:parse] Dropped unrecognized variable "--${name}" with value "${value}" (no routing matched)`
			);
		}
	}

	const darkBlock = extractBlock(content, /:root\s*,\s*\.theme-dark\s*\{/);
	if (darkBlock) {
		for (const { name, value } of extractDeclarations(darkBlock)) {
			if (SKIP_VARS.has(name)) continue;
			if (isHslAlias(value)) {
				// Tailwind palette refs: explicitly suppressed (designer uses external Figma library)
				if (isTailwindPaletteRef(value)) {
					continue;
				}

				// Try resolver if provided
				if (resolver) {
					const resolved = resolver.resolve(value, { mode: 'dark' });
					if (resolved && /^#[0-9a-fA-F]{6}$/.test(resolved)) {
						semanticColors.push({ path: [name], mode: 'dark', hex: resolved });
						continue;
					}
				}

				// Fallback: direct HSL channel tuple inside hsl(...) (no var indirection)
				const innerHasVar = /\bvar\s*\(/.test(value);
				if (innerHasVar) {
					console.warn(`[tokens:parse] Could not resolve "--${name}: ${value}" in dark mode.`);
					continue;
				}
				semanticColors.push({
					path: [name],
					mode: 'dark',
					hex: parseHslAlias(value),
				});
			}
		}
	}

	const lightBlock = extractBlock(content, /\.theme-light\s*\{/);
	if (lightBlock) {
		for (const { name, value } of extractDeclarations(lightBlock)) {
			if (SKIP_VARS.has(name)) continue;
			if (isHslAlias(value)) {
				// Tailwind palette refs: explicitly suppressed (designer uses external Figma library)
				if (isTailwindPaletteRef(value)) {
					continue;
				}

				// Try resolver if provided
				if (resolver) {
					const resolved = resolver.resolve(value, { mode: 'light' });
					if (resolved && /^#[0-9a-fA-F]{6}$/.test(resolved)) {
						semanticColors.push({ path: [name], mode: 'light', hex: resolved });
						continue;
					}
				}

				// Fallback: direct HSL channel tuple inside hsl(...) (no var indirection)
				const innerHasVar = /\bvar\s*\(/.test(value);
				if (innerHasVar) {
					console.warn(
						`[tokens:parse] Could not resolve "--${name}: ${value}" in light mode.`
					);
					continue;
				}
				semanticColors.push({
					path: [name],
					mode: 'light',
					hex: parseHslAlias(value),
				});
			}
		}
	}

	return { primitives, semanticColors, fluidTokens, scalarTokens, typography };
}

export function parseTailwindCss(content: string, resolver?: Resolver): ParsedTokens {
	const primitives: ColorPrimitive[] = [];
	const semanticColors: SemanticColor[] = [];
	const fluidTokens: FluidToken[] = [];
	const scalarTokens: ScalarToken[] = [];
	const typography: TypographyEntry[] = [];

	const staticBlock = extractBlock(content, /@theme\s+static\s*\{/);
	if (staticBlock) {
		for (const { name, value } of extractDeclarations(staticBlock)) {
			if (SKIP_VARS.has(name)) continue;

			// Explicit suppressions (no warning — these are intentional non-emits)
			if (isAnimationToken(name)) continue;
			if (isRedundantColorVar(name)) continue;

			// Calc() expressions (e.g. --spacing-header)
			if (resolver && /^calc\(/.test(value)) {
				const result = evaluateCalc(value, resolver);
				if (result && result.kind === 'fluid') {
					const path = pathFromName(name);
					if (path) {
						const prefix = path[0];
						const fluidType = FLUID_PREFIX_TO_TYPE[prefix];
						if (fluidType) {
							fluidTokens.push({ path, type: fluidType, fluid: result.fluid });
							continue;
						}
					}
				} else if (result && result.kind === 'dimension') {
					// Scalar calc result — emit as a sizing scalar
					const path = pathFromName(name);
					if (path) {
						scalarTokens.push({ path, type: 'sizing', value: result.value });
						continue;
					}
				}
				// calc unresolved — fall through to existing skip-with-warning logic
			}

			const clamp = isUtopiaClamp(value);
			if (clamp) {
				const path = pathFromName(name);
				if (!path) continue;
				const prefix = path[0];
				const fluidType = FLUID_PREFIX_TO_TYPE[prefix];
				if (fluidType) {
					fluidTokens.push({
						path,
						type: fluidType,
						fluid: interpolateClamp(clamp.min, clamp.max),
					});
				} else {
					console.warn(
						`[tokens:parse] Dropped unrecognized variable "--${name}" with value "${value}" (no routing matched)`
					);
				}
				continue;
			}

			const path = pathFromName(name);
			if (!path) continue;
			const scalarType = scalarTypeFor(path);
			if (scalarType) {
				let canonicalValue = value.trim();
				if (scalarType === 'duration') canonicalValue = normalizeDuration(canonicalValue);
				scalarTokens.push({ path, type: scalarType, value: canonicalValue });
				continue;
			}

			if (name === 'ease') {
				scalarTokens.push({
					path: ['ease'],
					type: 'cubicBezier',
					value: value.trim(),
				});
				continue;
			}

			console.warn(
				`[tokens:parse] Dropped unrecognized variable "--${name}" with value "${value}" (no routing matched)`
			);
		}
	}

	// @theme inline: extract ONLY clean utopia.clamp() declarations (skip var()/calc() aliases).
	const inlineBlock = extractBlock(content, /@theme\s+inline\s*\{/);
	if (inlineBlock) {
		for (const { name, value } of extractDeclarations(inlineBlock)) {
			if (SKIP_VARS.has(name)) continue;

			if (resolver && /^calc\(/.test(value)) {
				const result = evaluateCalc(value, resolver);
				if (result && result.kind === 'fluid') {
					const path = pathFromName(name);
					if (path) {
						const prefix = path[0];
						const fluidType = FLUID_PREFIX_TO_TYPE[prefix];
						if (fluidType) {
							fluidTokens.push({ path, type: fluidType, fluid: result.fluid });
							continue;
						}
					}
				}
				// calc unresolved — fall through to existing var/calc skip logic
			}

			// Bare var(--name) — resolve via resolver if it points to a fluid value.
			if (resolver && /^var\(--[\w-]+\)$/.test(value)) {
				const fluid = resolver.resolveFluid(value);
				if (fluid) {
					const path = pathFromName(name);
					if (path) {
						const prefix = path[0];
						const fluidType = FLUID_PREFIX_TO_TYPE[prefix];
						if (fluidType) {
							fluidTokens.push({ path, type: fluidType, fluid });
							continue;
						}
					}
				}
			}

			const clamp = isUtopiaClamp(value);
			if (!clamp) continue;

			const path = pathFromName(name);
			if (!path) continue;
			const prefix = path[0];
			const fluidType = FLUID_PREFIX_TO_TYPE[prefix];
			if (fluidType) {
				fluidTokens.push({
					path,
					type: fluidType,
					fluid: interpolateClamp(clamp.min, clamp.max),
				});
			} else {
				console.warn(
					`[tokens:parse] Dropped unrecognized variable "--${name}" with value "${value}" (no routing matched)`
				);
			}
		}
	}

	return { primitives, semanticColors, fluidTokens, scalarTokens, typography };
}

export function parseTypographyCss(content: string, resolver?: Resolver): ParsedTokens {
	// resolver currently unused in typography parsing — accepted for API parity with theme/tailwind parsers.
	void resolver;
	const primitives: ColorPrimitive[] = [];
	const semanticColors: SemanticColor[] = [];
	const fluidTokens: FluidToken[] = [];
	const scalarTokens: ScalarToken[] = [];
	const typography: TypographyEntry[] = [];

	// Type scale utilities of typography.css: heading-* and text-* (the token keeps the full name)
	const regex = /@utility\s+((?:heading|text)-[\w-]+)\s*\{([^}]*)\}/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const name = match[1];
		const body = match[2];

		const entry: TypographyEntry = { name };

		const fontSizeMatch = body.match(/font-size\s*:\s*([^;]+);/);
		if (fontSizeMatch) {
			const value = fontSizeMatch[1].trim();
			const clamp = isUtopiaClamp(value);
			if (clamp) {
				entry.fontSize = interpolateClamp(clamp.min, clamp.max);
			} else {
				const pxMatch = value.match(/^(\d+(?:\.\d+)?)px$/);
				if (pxMatch) {
					const n = parseFloat(pxMatch[1]);
					entry.fontSize = { mobile: n, tablet: n, laptop: n, desktop: n };
				}
			}
		}

		const lineHeightMatch = body.match(/line-height\s*:\s*([^;]+);/);
		if (lineHeightMatch) entry.lineHeight = lineHeightMatch[1].trim();

		const letterSpacingMatch = body.match(/letter-spacing\s*:\s*([^;]+);/);
		if (letterSpacingMatch) entry.letterSpacing = letterSpacingMatch[1].trim();

		const fontWeightMatch = body.match(/font-weight\s*:\s*([^;]+);/);
		if (fontWeightMatch) entry.fontWeight = fontWeightMatch[1].trim();

		typography.push(entry);
	}

	return { primitives, semanticColors, fluidTokens, scalarTokens, typography };
}
