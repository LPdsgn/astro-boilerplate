import { describe, expect, it } from 'vitest';
import { emitTokensStudio } from '../emit-tokens-studio';
import type { ParsedTokens } from '../schema';

const baseParsed: ParsedTokens = {
	primitives: [
		{ path: ['color', 'dark', '900'], hex: '#101010' },
		{ path: ['color', 'light', '900'], hex: '#efefef' },
		{ path: ['color', 'primary', '500'], hex: '#c5ff24' },
		{ path: ['black'], hex: '#000000' },
		{ path: ['white'], hex: '#ffffff' },
	],
	semanticColors: [
		{ path: ['background'], mode: 'dark', hex: '#101010' },
		{ path: ['background'], mode: 'light', hex: '#efefef' },
		{ path: ['primary'], mode: 'dark', hex: '#c5ff24' },
		{ path: ['primary'], mode: 'light', hex: '#ff002b' }, // off-palette
		{ path: ['primary-foreground'], mode: 'dark', hex: '#000000' },
		{ path: ['primary-foreground'], mode: 'light', hex: '#ffffff' },
	],
	fluidTokens: [
		{
			path: ['spacing', 'md'],
			type: 'spacing',
			fluid: { mobile: 32, tablet: 44, laptop: 57, desktop: 64 },
		},
	],
	scalarTokens: [
		{ path: ['z-index', 'modal'], type: 'number', value: '200' },
		{ path: ['transition-duration', 'fast'], type: 'duration', value: '200ms' },
		{
			path: ['ease'],
			type: 'cubicBezier',
			value: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
		},
	],
	typography: [
		{
			name: 'title',
			fontSize: { mobile: 40, tablet: 72, laptop: 109, desktop: 128 },
			lineHeight: '0.9',
			letterSpacing: '-0.025em',
		},
	],
};

describe('emitTokensStudio', () => {
	it('produces a parseable JSON string', () => {
		const out = emitTokensStudio(baseParsed);
		expect(() => JSON.parse(out)).not.toThrow();
	});

	it('places $metadata first with version, source, tokenSetOrder', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed.$metadata).toBeDefined();
		expect(parsed.$metadata.version).toBe('1.0.0');
		expect(typeof parsed.$metadata.source).toBe('string');
		expect(parsed.$metadata.tokenSetOrder).toEqual([
			'core',
			'theme/light',
			'theme/dark',
			'responsive/mobile',
			'responsive/tablet',
			'responsive/laptop',
			'responsive/desktop',
		]);
	});

	it('emits all 7 token sets', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		for (const set of [
			'core',
			'theme/light',
			'theme/dark',
			'responsive/mobile',
			'responsive/tablet',
			'responsive/laptop',
			'responsive/desktop',
		]) {
			expect(parsed[set]).toBeDefined();
		}
	});

	it('emits $themes with 6 entries mapping to Figma collections and modes', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed.$themes).toHaveLength(6);
		const light = parsed.$themes.find((t: any) => t.name === 'Light');
		expect(light.$figmaCollection).toBe('Theme');
		expect(light.$figmaMode).toBe('light');
		expect(light.selectedTokenSets['theme/light']).toBe('enabled');
		expect(light.selectedTokenSets['core']).toBe('source');
		const mobile = parsed.$themes.find((t: any) => t.name === 'Mobile');
		expect(mobile.$figmaCollection).toBe('Responsive');
		expect(mobile.$figmaMode).toBe('mobile');
	});

	it('places primitives into core.color.* with nested shade paths', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed.core.color.dark[900]).toEqual({ value: '#101010', type: 'color' });
		expect(parsed.core.color.primary[500]).toEqual({ value: '#c5ff24', type: 'color' });
		// black/white stay at top-level under core (not under color/).
		expect(parsed.core.black).toEqual({ value: '#000000', type: 'color' });
	});

	it('places scalar tokens into the core set', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed.core['z-index'].modal).toEqual({ value: '200', type: 'number' });
		expect(parsed.core['transition-duration'].fast).toEqual({
			value: '200ms',
			type: 'duration',
		});
		expect(parsed.core.ease).toEqual({
			value: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
			type: 'cubicBezier',
		});
	});

	it('aliases semantic colors to existing primitives when value matches', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed['theme/dark'].background).toEqual({
			value: '{core.color.dark.900}',
			type: 'color',
		});
		expect(parsed['theme/light'].background).toEqual({
			value: '{core.color.light.900}',
			type: 'color',
		});
		expect(parsed['theme/dark'].primary).toEqual({
			value: '{core.color.primary.500}',
			type: 'color',
		});
		expect(parsed['theme/dark']['primary-foreground']).toEqual({
			value: '{core.black}',
			type: 'color',
		});
	});

	it('synthesizes a leaf primitive under core.color.* when a semantic color is off-palette', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		// theme/light.primary is #ff002b which is not in the primary scale;
		// the synthetic primitive lands at core.color.primary-light as a leaf (no shade nesting).
		expect(parsed.core.color['primary-light']).toEqual({
			value: '#ff002b',
			type: 'color',
		});
		expect(parsed['theme/light'].primary).toEqual({
			value: '{core.color.primary-light}',
			type: 'color',
		});
	});

	it('uses full semantic path in synthetic primitive name to avoid collisions', () => {
		const off: ParsedTokens = {
			primitives: [{ path: ['color', 'primary', '500'], hex: '#c5ff24' }],
			semanticColors: [
				// Same path[0] 'primary' but different full paths; both off-palette in same mode.
				{ path: ['primary', 'subtle'], mode: 'light', hex: '#aabbcc' },
				{ path: ['primary', 'bold'], mode: 'light', hex: '#112233' },
			],
			fluidTokens: [],
			scalarTokens: [],
			typography: [],
		};
		const parsed = JSON.parse(emitTokensStudio(off));
		// Each synthetic should land at its own unique core.color.<name> leaf.
		expect(parsed.core.color['primary-subtle-light']).toEqual({
			value: '#aabbcc',
			type: 'color',
		});
		expect(parsed.core.color['primary-bold-light']).toEqual({
			value: '#112233',
			type: 'color',
		});
	});

	it('emits fluid tokens into each responsive/* set with per-mode value', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed['responsive/mobile'].spacing.md).toEqual({
			value: '32px',
			type: 'spacing',
		});
		expect(parsed['responsive/tablet'].spacing.md).toEqual({
			value: '44px',
			type: 'spacing',
		});
		expect(parsed['responsive/laptop'].spacing.md).toEqual({
			value: '57px',
			type: 'spacing',
		});
		expect(parsed['responsive/desktop'].spacing.md).toEqual({
			value: '64px',
			type: 'spacing',
		});
	});

	it('emits typography composites with per-mode font-size and duplicated sub-properties', () => {
		const parsed = JSON.parse(emitTokensStudio(baseParsed));
		expect(parsed['responsive/mobile'].type.title['font-size']).toEqual({
			value: '40px',
			type: 'sizing',
		});
		expect(parsed['responsive/desktop'].type.title['font-size']).toEqual({
			value: '128px',
			type: 'sizing',
		});
		// Sub-properties duplicated across all modes:
		expect(parsed['responsive/mobile'].type.title['line-height']).toEqual({
			value: '0.9',
			type: 'lineHeights',
		});
		expect(parsed['responsive/desktop'].type.title['line-height']).toEqual({
			value: '0.9',
			type: 'lineHeights',
		});
		expect(parsed['responsive/mobile'].type.title['letter-spacing']).toEqual({
			value: '-0.025em',
			type: 'letterSpacing',
		});
	});

	it('produces canonical output (sorted keys, deterministic across runs)', () => {
		const out1 = emitTokensStudio(baseParsed);
		const out2 = emitTokensStudio(baseParsed);
		expect(out1).toBe(out2);
	});

	it('ends with a single trailing newline and uses LF line endings', () => {
		const out = emitTokensStudio(baseParsed);
		expect(out.endsWith('\n')).toBe(true);
		expect(out.endsWith('\n\n')).toBe(false);
		expect(out.includes('\r\n')).toBe(false);
	});
});
