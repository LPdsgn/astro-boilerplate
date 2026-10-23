import type { Resolver, ResolvedEntry } from './schema';
import { hslChannelTupleToHex } from './color';
import { interpolateClamp } from './utopia';
import { evaluateCalc } from './calc';

const MAX_RESOLVE_DEPTH = 8;

interface RawDeclaration {
	name: string;
	value: string;
}

interface CssSources {
	theme: string;
	tailwind: string;
	typography: string;
}

function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractBlock(content: string, header: RegExp): string | null {
	const stripped = stripComments(content);
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
	const out: RawDeclaration[] = [];
	const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(blockBody)) !== null) {
		out.push({ name: match[1], value: match[2].trim() });
	}
	return out;
}

function isHslAlias(value: string): boolean {
	return /^hsl\s*\(/i.test(value);
}

function isVarRef(value: string): { name: string } | null {
	const m = value.trim().match(/^var\s*\(\s*--([\w-]+)\s*(?:,[^)]*)?\)$/);
	return m ? { name: m[1] } : null;
}

function isUtopiaClamp(value: string): { min: number; max: number } | null {
	const m = value.match(/^utopia\.clamp\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i);
	return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
}

function isHslChannelTuple(value: string): boolean {
	return /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(value.trim());
}

function parseHslAlias(value: string): string | null {
	const inner = value.replace(/^hsl\s*\(/i, '').replace(/\)\s*$/, '');
	const normalized = inner.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
	if (!isHslChannelTuple(normalized)) return null;
	return hslChannelTupleToHex(normalized);
}

interface SymbolTable {
	flat: Map<string, ResolvedEntry>;
	byMode: Map<string, { light?: ResolvedEntry; dark?: ResolvedEntry }>;
}

function setFlat(table: SymbolTable, name: string, entry: ResolvedEntry): void {
	table.flat.set(name, entry);
}

function setMode(
	table: SymbolTable,
	name: string,
	mode: 'light' | 'dark',
	entry: ResolvedEntry
): void {
	const existing = table.byMode.get(name) ?? {};
	existing[mode] = entry;
	table.byMode.set(name, existing);
}

function lookup(
	table: SymbolTable,
	name: string,
	mode: 'light' | 'dark' | undefined
): ResolvedEntry | null {
	if (mode) {
		const modeEntries = table.byMode.get(name);
		if (modeEntries && modeEntries[mode]) return modeEntries[mode]!;
	}
	const flat = table.flat.get(name);
	if (flat) return flat;
	const modeEntries = table.byMode.get(name);
	if (modeEntries) return modeEntries.dark ?? modeEntries.light ?? null;
	return null;
}

function resolveValue(
	value: string,
	table: SymbolTable,
	mode: 'light' | 'dark' | undefined,
	depth: number
): ResolvedEntry | null {
	if (depth > MAX_RESOLVE_DEPTH) {
		console.warn(`[tokens:resolve] var() chain too deep (>${MAX_RESOLVE_DEPTH} hops). Aborting.`);
		return null;
	}

	if (isHslChannelTuple(value)) {
		return { kind: 'color', hex: hslChannelTupleToHex(value) };
	}

	if (isHslAlias(value)) {
		const inner = value
			.replace(/^hsl\s*\(/i, '')
			.replace(/\)\s*$/, '')
			.trim();
		const innerVar = isVarRef(inner);
		if (innerVar) {
			const looked = lookup(table, innerVar.name, mode);
			if (looked && looked.kind === 'color' && 'hex' in looked) {
				return looked;
			}
			if (looked && looked.kind === 'raw') {
				// If the raw value is itself a tuple, parse directly.
				if (isHslChannelTuple(looked.value)) {
					return { kind: 'color', hex: hslChannelTupleToHex(looked.value) };
				}
				// If the raw value is another hsl(...) or var(...) expression,
				// recurse so deep chains hit the depth limit.
				if (isHslAlias(looked.value) || isVarRef(looked.value)) {
					return resolveValue(looked.value, table, mode, depth + 1);
				}
				return null;
			}
			return null;
		}
		const direct = parseHslAlias(value);
		return direct ? { kind: 'color', hex: direct } : null;
	}

	const varRef = isVarRef(value);
	if (varRef) {
		const looked = lookup(table, varRef.name, mode);
		if (looked) return looked;
		return null;
	}

	const clamp = isUtopiaClamp(value);
	if (clamp) {
		return { kind: 'fluid', fluid: interpolateClamp(clamp.min, clamp.max) };
	}

	if (/^\d+(?:\.\d+)?(?:ms|s)$/.test(value)) {
		return { kind: 'duration', value };
	}
	if (/^cubic-bezier\(/.test(value)) {
		return { kind: 'cubicBezier', value };
	}
	if (/^-?\d+(?:\.\d+)?(?:px|em|rem|%)$/.test(value)) {
		return { kind: 'dimension', value };
	}

	return { kind: 'raw', value };
}

// Constructs a Resolver view over the in-progress symbol table. Used while
// building the table itself so calc() expressions can reference vars declared
// earlier in the same source file.
function buildPartialResolver(table: SymbolTable): Resolver {
	return {
		resolve(value, opts) {
			if (!isHslAlias(value) && !isVarRef(value)) return null;
			const entry = resolveValue(value, table, opts?.mode, 0);
			if (!entry) return null;
			if (entry.kind === 'color' && 'hex' in entry) return entry.hex;
			if (entry.kind === 'dimension') return entry.value;
			if (entry.kind === 'duration') return entry.value;
			if (entry.kind === 'cubicBezier') return entry.value;
			if (entry.kind === 'raw') return entry.value;
			return null;
		},
		resolveFluid(value) {
			const entry = resolveValue(value, table, undefined, 0);
			return entry && entry.kind === 'fluid' ? entry.fluid : null;
		},
		getFont() {
			return null;
		},
	};
}

export function buildResolver(sources: CssSources): Resolver {
	const table: SymbolTable = { flat: new Map(), byMode: new Map() };

	// Pass 1: theme.css :root — primitives + base scalars
	const rootBlock = extractBlock(sources.theme, /:root\s*\{/);
	if (rootBlock) {
		for (const { name, value } of extractDeclarations(rootBlock)) {
			if (isHslChannelTuple(value)) {
				setFlat(table, name, {
					kind: 'color',
					hex: hslChannelTupleToHex(value),
				});
			} else if (isHslAlias(value)) {
				const entry = resolveValue(value, table, undefined, 0);
				if (entry) setFlat(table, name, entry);
				else setFlat(table, name, { kind: 'raw', value });
			} else if (isUtopiaClamp(value)) {
				const c = isUtopiaClamp(value)!;
				setFlat(table, name, {
					kind: 'fluid',
					fluid: interpolateClamp(c.min, c.max),
				});
			} else if (/^-?\d+(?:\.\d+)?(?:px|em|rem|%)?$/.test(value)) {
				setFlat(table, name, { kind: 'dimension', value });
			} else {
				setFlat(table, name, { kind: 'raw', value });
			}
		}
	}

	// Pass 2: theme.css :root, .theme-dark — dark semantic colors + base scalars
	const darkBlock = extractBlock(sources.theme, /:root\s*,\s*\.theme-dark\s*\{/);
	if (darkBlock) {
		for (const { name, value } of extractDeclarations(darkBlock)) {
			if (isHslAlias(value)) {
				const entry = resolveValue(value, table, 'dark', 0);
				if (entry && entry.kind === 'color' && 'hex' in entry) {
					setMode(table, name, 'dark', entry);
				}
			} else if (isUtopiaClamp(value)) {
				const c = isUtopiaClamp(value)!;
				setFlat(table, name, {
					kind: 'fluid',
					fluid: interpolateClamp(c.min, c.max),
				});
			} else if (/^-?\d+(?:\.\d+)?(?:px|em|rem|%)?$/.test(value)) {
				setFlat(table, name, { kind: 'dimension', value });
			}
		}
	}

	// Pass 3: theme.css .theme-light — light semantic colors
	const lightBlock = extractBlock(sources.theme, /\.theme-light\s*\{/);
	if (lightBlock) {
		for (const { name, value } of extractDeclarations(lightBlock)) {
			if (isHslAlias(value)) {
				const entry = resolveValue(value, table, 'light', 0);
				if (entry && entry.kind === 'color' && 'hex' in entry) {
					setMode(table, name, 'light', entry);
				}
			}
		}
	}

	// Pass 4: tailwind.css @theme static
	const staticBlock = extractBlock(sources.tailwind, /@theme\s+static\s*\{/);
	if (staticBlock) {
		for (const { name, value } of extractDeclarations(staticBlock)) {
			const clamp = isUtopiaClamp(value);
			if (clamp) {
				setFlat(table, name, {
					kind: 'fluid',
					fluid: interpolateClamp(clamp.min, clamp.max),
				});
			} else if (/^calc\(/.test(value)) {
				// Evaluate calc using the partial table built so far. Declarations
				// must appear in dependency order in CSS for this to resolve correctly.
				const partial = buildPartialResolver(table);
				const result = evaluateCalc(value, partial);
				if (result && result.kind === 'fluid') {
					setFlat(table, name, { kind: 'fluid', fluid: result.fluid });
				} else if (result && result.kind === 'dimension') {
					setFlat(table, name, { kind: 'dimension', value: result.value });
				} else {
					setFlat(table, name, { kind: 'raw', value });
				}
			} else if (/^\d+(?:\.\d+)?(?:ms|s)$/.test(value)) {
				setFlat(table, name, { kind: 'duration', value });
			} else if (/^cubic-bezier\(/.test(value)) {
				setFlat(table, name, { kind: 'cubicBezier', value });
			} else if (/^-?\d+(?:\.\d+)?(?:px|em|rem|%)?$/.test(value)) {
				setFlat(table, name, { kind: 'dimension', value });
			} else {
				setFlat(table, name, { kind: 'raw', value });
			}
		}
	}

	// Pass 5: tailwind.css @theme inline — aliases (resolve recursively)
	const inlineBlock = extractBlock(sources.tailwind, /@theme\s+inline\s*\{/);
	if (inlineBlock) {
		for (const { name, value } of extractDeclarations(inlineBlock)) {
			const resolved = resolveValue(value, table, undefined, 0);
			if (resolved) setFlat(table, name, resolved);
		}
	}

	return {
		resolve(value, opts) {
			// The public API only resolves expressions that reference vars or hsl().
			// Literal values (hex, dimensions, etc.) are passthrough — caller's job.
			if (!isHslAlias(value) && !isVarRef(value)) {
				return null;
			}
			const entry = resolveValue(value, table, opts?.mode, 0);
			if (!entry) {
				console.warn(`[tokens:resolve] Unable to resolve value "${value}"`);
				return null;
			}
			if (entry.kind === 'color' && 'hex' in entry) return entry.hex;
			if (entry.kind === 'dimension') return entry.value;
			if (entry.kind === 'duration') return entry.value;
			if (entry.kind === 'cubicBezier') return entry.value;
			if (entry.kind === 'raw') return entry.value;
			return null;
		},
		resolveFluid(value) {
			const entry = resolveValue(value, table, undefined, 0);
			if (entry && entry.kind === 'fluid') return entry.fluid;
			return null;
		},
		getFont() {
			// Font resolution is provided by a separate module (font-config.ts, Task 4).
			return null;
		},
	};
}
