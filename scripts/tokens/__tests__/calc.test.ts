import { describe, expect, it, vi } from 'vitest';
import { evaluateCalc } from '../calc';
import type { Resolver } from '../schema';

function fakeResolver(map: Record<string, any>): Resolver {
	return {
		resolve: (v) => {
			const m = v.match(/^var\(--([\w-]+)\)$/);
			return m && map[m[1]] && typeof map[m[1]] === 'string' ? map[m[1]] : null;
		},
		resolveFluid: (v) => {
			const m = v.match(/^var\(--([\w-]+)\)$/);
			return m && map[m[1]] && typeof map[m[1]] === 'object' ? map[m[1]] : null;
		},
		getFont: () => null,
	};
}

describe('evaluateCalc', () => {
	it('handles a single utopia.clamp (degenerate calc)', () => {
		const result = evaluateCalc('calc(utopia.clamp(6, 12))', fakeResolver({}));
		// At 360 anchor: clamp(6, 12) → mobile=6, tablet=8 (6+6*408/1176=8.08→8), laptop=11 (6+6*920/1176=10.69→11), desktop=12
		expect(result).toEqual({
			kind: 'fluid',
			fluid: { mobile: 6, tablet: 8, laptop: 11, desktop: 12 },
		});
	});

	it('subtracts a rem constant from a fluid base', () => {
		// calc(utopia.clamp(6, 12) - 0.375rem) → per-mode minus 6px (0.375rem * 16px/rem)
		const result = evaluateCalc('calc(utopia.clamp(6, 12) - 0.375rem)', fakeResolver({}));
		// base: {mobile:6, tablet:8, laptop:11, desktop:12}
		// minus 6 each: {mobile:0, tablet:2, laptop:5, desktop:6}
		expect(result).toEqual({
			kind: 'fluid',
			fluid: { mobile: 0, tablet: 2, laptop: 5, desktop: 6 },
		});
	});

	it('adds a rem constant to a fluid base', () => {
		const result = evaluateCalc('calc(utopia.clamp(6, 12) + 0.5rem)', fakeResolver({}));
		// fluid + 8px: {mobile:14, tablet:16, laptop:19, desktop:20}
		expect(result).toEqual({
			kind: 'fluid',
			fluid: { mobile: 14, tablet: 16, laptop: 19, desktop: 20 },
		});
	});

	it('handles mixed: fluid + (var * 2)', () => {
		// --spacing-gutter resolves to fluid {mobile:16, tablet:19, laptop:22, desktop:24}
		const resolver = fakeResolver({
			'spacing-gutter': {
				mobile: 16,
				tablet: 19,
				laptop: 22,
				desktop: 24,
			},
		});
		const result = evaluateCalc(
			'calc(utopia.clamp(36, 40) + (var(--spacing-gutter) * 2))',
			resolver
		);
		// base clamp(36, 40) at 360 anchor:
		// slope = 4/1176 = 0.0034
		// mobile: 36
		// tablet: 36 + 4*408/1176 = 36 + 1.39 = 37.39 → 37
		// laptop: 36 + 4*920/1176 = 36 + 3.13 = 39.13 → 39
		// desktop: 40
		// Plus (gutter * 2):
		// mobile: 36 + 32 = 68
		// tablet: 37 + 38 = 75 (using the rounded base; or 37.39+38=75.39→75 also)
		// laptop: 39 + 44 = 83 (or 39.13+44=83.13→83)
		// desktop: 40 + 48 = 88
		expect(result?.kind).toBe('fluid');
		if (result?.kind === 'fluid') {
			expect(result.fluid.mobile).toBe(68);
			expect(result.fluid.tablet).toBe(75);
			expect(result.fluid.laptop).toBe(83);
			expect(result.fluid.desktop).toBe(88);
		}
	});

	it('returns null for nested calc()', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = evaluateCalc('calc(calc(1px + 2px) * 3)', fakeResolver({}));
		expect(result).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('returns null for non-outer division (only `(expr) / N` is supported)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = evaluateCalc('calc(10px / 2)', fakeResolver({}));
		expect(result).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('supports outer division: (var - var) / N', () => {
		const resolver = fakeResolver({
			'spacing-whole': { mobile: 328, tablet: 720, laptop: 1210, desktop: 1456 },
			'spacing-gutter': { mobile: 16, tablet: 19, laptop: 22, desktop: 24 },
		});
		const result = evaluateCalc(
			'calc((var(--spacing-whole) - var(--spacing-gutter)) / 2)',
			resolver
		);
		expect(result?.kind).toBe('fluid');
		if (result?.kind === 'fluid') {
			// (328-16)/2 = 156
			// (720-19)/2 = 350.5 → 351 (Math.round rounds half up for positive)
			// (1210-22)/2 = 594
			// (1456-24)/2 = 716
			expect(result.fluid).toEqual({ mobile: 156, tablet: 351, laptop: 594, desktop: 716 });
		}
	});

	it('supports outer division with internal multiplication: (var - var * 2) / 3', () => {
		const resolver = fakeResolver({
			'spacing-whole': { mobile: 328, tablet: 720, laptop: 1210, desktop: 1456 },
			'spacing-gutter': { mobile: 16, tablet: 19, laptop: 22, desktop: 24 },
		});
		const result = evaluateCalc(
			'calc((var(--spacing-whole) - var(--spacing-gutter) * 2) / 3)',
			resolver
		);
		expect(result?.kind).toBe('fluid');
		if (result?.kind === 'fluid') {
			// (328-32)/3 ≈ 99, (720-38)/3 ≈ 227, (1210-44)/3 ≈ 389, (1456-48)/3 ≈ 469
			expect(result.fluid).toEqual({ mobile: 99, tablet: 227, laptop: 389, desktop: 469 });
		}
	});

	it('supports outer division with var-times multiplier inside: (var * 3 - var) / 4', () => {
		const resolver = fakeResolver({
			'spacing-whole': { mobile: 328, tablet: 720, laptop: 1210, desktop: 1456 },
			'spacing-gutter': { mobile: 16, tablet: 19, laptop: 22, desktop: 24 },
		});
		const result = evaluateCalc(
			'calc((var(--spacing-whole) * 3 - var(--spacing-gutter)) / 4)',
			resolver
		);
		expect(result?.kind).toBe('fluid');
		if (result?.kind === 'fluid') {
			// (984-16)/4=242, (2160-19)/4=535.25→535, (3630-22)/4=902, (4368-24)/4=1086
			expect(result.fluid).toEqual({ mobile: 242, tablet: 535, laptop: 902, desktop: 1086 });
		}
	});

	it('returns null for mixed-unit arithmetic', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = evaluateCalc('calc(10px + 1em)', fakeResolver({}));
		expect(result).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('returns scalar dimension for pure-scalar calc', () => {
		const result = evaluateCalc('calc(10px + 5px)', fakeResolver({}));
		expect(result).toEqual({ kind: 'dimension', value: '15px' });
	});
});
