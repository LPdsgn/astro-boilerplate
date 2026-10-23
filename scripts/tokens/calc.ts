import type { FluidModes, Resolver } from './schema';
import { interpolateClamp } from './utopia';

const ROOT_SIZE = 16;

type Term = { kind: 'scalar'; px: number } | { kind: 'fluid'; fluid: FluidModes };

type CalcResult =
	{ kind: 'fluid'; fluid: FluidModes } | { kind: 'dimension'; value: string } | null;

function unitToPx(value: string): number | null {
	const m = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem)$/);
	if (!m) return null;
	const n = parseFloat(m[1]);
	return m[2] === 'rem' ? n * ROOT_SIZE : n;
}

function parseUtopiaClamp(value: string): { min: number; max: number } | null {
	const m = value.match(/^utopia\.clamp\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i);
	return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
}

function parseVarTimes(value: string, resolver: Resolver): FluidModes | null {
	// Match `(var(--name) * N)` or `var(--name) * N` or `N * var(--name)`
	let m = value.match(/^\(?\s*var\(--([\w-]+)\)\s*\*\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
	let varName: string | undefined;
	let factor: number | undefined;
	if (m) {
		varName = m[1];
		factor = parseFloat(m[2]);
	} else {
		m = value.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*\*\s*var\(--([\w-]+)\)\s*\)?$/);
		if (m) {
			factor = parseFloat(m[1]);
			varName = m[2];
		}
	}
	if (!varName || factor === undefined) return null;
	const fluid = resolver.resolveFluid(`var(--${varName})`);
	if (!fluid) return null;
	return {
		mobile: fluid.mobile * factor,
		tablet: fluid.tablet * factor,
		laptop: fluid.laptop * factor,
		desktop: fluid.desktop * factor,
	};
}

function termFromValue(value: string, resolver: Resolver): Term | null {
	const trimmed = value.trim();

	const clamp = parseUtopiaClamp(trimmed);
	if (clamp) {
		return { kind: 'fluid', fluid: interpolateClamp(clamp.min, clamp.max) };
	}

	const varMul = parseVarTimes(trimmed, resolver);
	if (varMul) return { kind: 'fluid', fluid: varMul };

	const varMatch = trimmed.match(/^var\(--([\w-]+)\)$/);
	if (varMatch) {
		const fluid = resolver.resolveFluid(trimmed);
		if (fluid) return { kind: 'fluid', fluid };
		const resolved = resolver.resolve(trimmed);
		if (resolved) {
			const px = unitToPx(resolved);
			if (px !== null) return { kind: 'scalar', px };
		}
		return null;
	}

	const px = unitToPx(trimmed);
	if (px !== null) return { kind: 'scalar', px };

	return null;
}

function fluidFromScalar(px: number): FluidModes {
	return { mobile: px, tablet: px, laptop: px, desktop: px };
}

function addTerms(a: Term, b: Term): Term {
	if (a.kind === 'scalar' && b.kind === 'scalar') {
		return { kind: 'scalar', px: a.px + b.px };
	}
	const fa = a.kind === 'fluid' ? a.fluid : fluidFromScalar(a.px);
	const fb = b.kind === 'fluid' ? b.fluid : fluidFromScalar(b.px);
	return {
		kind: 'fluid',
		fluid: {
			mobile: fa.mobile + fb.mobile,
			tablet: fa.tablet + fb.tablet,
			laptop: fa.laptop + fb.laptop,
			desktop: fa.desktop + fb.desktop,
		},
	};
}

function subTerms(a: Term, b: Term): Term {
	const negated: Term =
		b.kind === 'scalar'
			? { kind: 'scalar', px: -b.px }
			: {
					kind: 'fluid',
					fluid: {
						mobile: -b.fluid.mobile,
						tablet: -b.fluid.tablet,
						laptop: -b.fluid.laptop,
						desktop: -b.fluid.desktop,
					},
				};
	return addTerms(a, negated);
}

// Evaluate a sum expression (top-level + and -, no outer division).
// Returns an unrounded Term, or null on failure.
function evaluateSum(inner: string, resolver: Resolver, source: string): Term | null {
	const tokens: { op: '+' | '-'; expr: string }[] = [];
	let depth = 0;
	let current = '';
	let currentOp: '+' | '-' = '+';
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (ch === '(') depth++;
		else if (ch === ')') depth--;
		if (depth === 0 && (ch === '+' || ch === '-') && current.trim().length > 0) {
			tokens.push({ op: currentOp, expr: current.trim() });
			currentOp = ch as '+' | '-';
			current = '';
			continue;
		}
		current += ch;
	}
	if (current.trim().length > 0) {
		tokens.push({ op: currentOp, expr: current.trim() });
	}

	let acc: Term | null = null;
	for (const t of tokens) {
		const term = termFromValue(t.expr, resolver);
		if (!term) {
			console.warn(`[tokens:calc] Cannot evaluate term "${t.expr}" in ${source}`);
			return null;
		}
		if (acc === null) {
			acc = t.op === '-' && term.kind === 'scalar' ? { kind: 'scalar', px: -term.px } : term;
		} else {
			acc = t.op === '+' ? addTerms(acc, term) : subTerms(acc, term);
		}
	}
	return acc;
}

// Match `(dividend) / N` form. Returns the dividend expression and integer divisor.
function matchOuterDivision(inner: string): { dividend: string; divisor: number } | null {
	const m = inner.match(/^\(([\s\S]+)\)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
	if (!m) return null;
	return { dividend: m[1].trim(), divisor: parseFloat(m[2]) };
}

function divideTerm(term: Term, divisor: number): Term {
	if (term.kind === 'scalar') return { kind: 'scalar', px: term.px / divisor };
	return {
		kind: 'fluid',
		fluid: {
			mobile: term.fluid.mobile / divisor,
			tablet: term.fluid.tablet / divisor,
			laptop: term.fluid.laptop / divisor,
			desktop: term.fluid.desktop / divisor,
		},
	};
}

export function evaluateCalc(value: string, resolver: Resolver): CalcResult {
	const m = value.trim().match(/^calc\s*\(([\s\S]+)\)$/);
	if (!m) {
		console.warn(`[tokens:calc] Not a calc() expression: ${value}`);
		return null;
	}
	const inner = m[1].trim();

	if (inner.includes('calc(')) {
		console.warn(`[tokens:calc] Nested calc() not supported: ${value}`);
		return null;
	}

	// Mixed-unit check: literal em alongside literal px/rem isn't supported.
	if (/\b\d+(?:\.\d+)?em\b/.test(inner) && /\b\d+(?:\.\d+)?(?:px|rem)\b/.test(inner)) {
		console.warn(`[tokens:calc] Mixed-unit arithmetic not supported: ${value}`);
		return null;
	}

	// Outer division: `(expr) / N` — evaluate dividend, then divide.
	const div = matchOuterDivision(inner);
	if (div) {
		const dividendTerm = evaluateSum(div.dividend, resolver, value);
		if (!dividendTerm) return null;
		const divided = divideTerm(dividendTerm, div.divisor);
		if (divided.kind === 'fluid') {
			return {
				kind: 'fluid',
				fluid: {
					mobile: Math.round(divided.fluid.mobile),
					tablet: Math.round(divided.fluid.tablet),
					laptop: Math.round(divided.fluid.laptop),
					desktop: Math.round(divided.fluid.desktop),
				},
			};
		}
		return { kind: 'dimension', value: `${Math.round(divided.px)}px` };
	}

	// No outer division — but reject any other `/` use (we don't support general division).
	if (inner.includes('/')) {
		console.warn(`[tokens:calc] Only outer "(expr) / N" division is supported: ${value}`);
		return null;
	}

	const acc = evaluateSum(inner, resolver, value);
	if (!acc) return null;
	if (acc.kind === 'fluid') {
		return {
			kind: 'fluid',
			fluid: {
				mobile: Math.round(acc.fluid.mobile),
				tablet: Math.round(acc.fluid.tablet),
				laptop: Math.round(acc.fluid.laptop),
				desktop: Math.round(acc.fluid.desktop),
			},
		};
	}
	return { kind: 'dimension', value: `${Math.round(acc.px)}px` };
}
