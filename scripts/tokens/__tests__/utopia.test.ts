import { describe, expect, it } from 'vitest';
import { interpolateClamp } from '../utopia';

describe('interpolateClamp', () => {
	it('returns min/max at viewport extremes', () => {
		const result = interpolateClamp(32, 64);
		expect(result.mobile).toBe(32); // viewport 320 = min
		expect(result.desktop).toBe(64); // viewport 1536 = max
	});

	it('interpolates linearly at intermediate viewports', () => {
		// clamp(0, 1216) over 360→1536 = range 1176, slope = 1216/1176 ≈ 1.034
		// At tablet 768: 0 + 1.034 * (768-360) = 1.034 * 408 = 421.87 → 422
		// At laptop 1280: 0 + 1.034 * (1280-360) = 1.034 * 920 = 951.43 → 951
		const result = interpolateClamp(0, 1216);
		expect(result.mobile).toBe(0);
		expect(result.tablet).toBe(422);
		expect(result.laptop).toBe(951);
		expect(result.desktop).toBe(1216);
	});

	it('rounds to integer px (no half-pixels)', () => {
		// clamp(8, 16) — slope = 8/1176 = 0.006803
		// tablet (768): 8 + 0.006803 * 408 = 8 + 2.7755 = 10.78 → 11
		// laptop (1280): 8 + 0.006803 * 920 = 8 + 6.2585 = 14.26 → 14
		const result = interpolateClamp(8, 16);
		expect(Number.isInteger(result.mobile)).toBe(true);
		expect(Number.isInteger(result.tablet)).toBe(true);
		expect(Number.isInteger(result.laptop)).toBe(true);
		expect(Number.isInteger(result.desktop)).toBe(true);
		expect(result.mobile).toBe(8);
		expect(result.tablet).toBe(11);
		expect(result.laptop).toBe(14);
		expect(result.desktop).toBe(16);
	});

	it('handles spacing.md (24→40) per current scale', () => {
		const result = interpolateClamp(24, 40);
		// slope = 16/1176 = 0.01361
		// tablet: 24 + 0.01361 * 408 = 24 + 5.55 = 29.55 → 30
		// laptop: 24 + 0.01361 * 920 = 24 + 12.52 = 36.52 → 37
		expect(result).toEqual({ mobile: 24, tablet: 30, laptop: 37, desktop: 40 });
	});

	it('handles type.title (40→128) — large fluid range', () => {
		const result = interpolateClamp(40, 128);
		// slope = 88/1176 = 0.07483
		// tablet: 40 + 0.07483 * 408 = 40 + 30.53 = 70.53 → 71
		// laptop: 40 + 0.07483 * 920 = 40 + 68.84 = 108.84 → 109
		expect(result).toEqual({ mobile: 40, tablet: 71, laptop: 109, desktop: 128 });
	});

	it('handles type.xxs which is non-fluid (12, 12) in CSS but if called returns flat', () => {
		const result = interpolateClamp(12, 12);
		expect(result).toEqual({ mobile: 12, tablet: 12, laptop: 12, desktop: 12 });
	});

	it('handles negative min (rare but valid in CSS)', () => {
		const result = interpolateClamp(-10, 10);
		expect(result.mobile).toBe(-10);
		expect(result.desktop).toBe(10);
	});
});
