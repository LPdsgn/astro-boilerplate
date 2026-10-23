import { describe, expect, it, vi } from 'vitest';
import { parseThemeCss, parseTailwindCss, parseTypographyCss } from '../parse-css';
import { buildResolver } from '../resolve';

describe('parseThemeCss', () => {
	const sample = `
		:root {
			--dark-900: 0 0% 6.2%;
			--dark-800: 0 0% 11%;
			--primary-500: 76 100% 57%;
			--error-500: 0 65% 45%;
			--black: 0 0% 0%;
			--white: 0 0% 100%;
		}

		:root,
		.theme-dark {
			--background: hsl(0 0% 6.2%);
			--foreground: hsl(0 0% 100%);
			--primary: hsl(76 100% 57%);
			--primary-foreground: hsl(0 0% 0%);
			--radius: utopia.clamp(6, 12);
			--spacing: 0.25rem;
		}

		.theme-light {
			--background: hsl(0 0% 93.8%);
			--foreground: hsl(0 0% 0%);
			--primary: hsl(350, 100%, 50%);
			--primary-foreground: hsl(0 0% 100%);
		}
	`;

	it('extracts color primitives from :root with prefix routing under color/', () => {
		const result = parseThemeCss(sample);
		expect(result.primitives).toContainEqual({
			path: ['color', 'dark', '900'],
			hex: '#101010',
		});
		expect(result.primitives).toContainEqual({
			path: ['color', 'primary', '500'],
			hex: '#c5ff24',
		});
		expect(result.primitives).toContainEqual({
			path: ['color', 'error', '500'],
			hex: '#bd2828',
		});
		expect(result.primitives).toContainEqual({
			path: ['black'],
			hex: '#000000',
		});
		expect(result.primitives).toContainEqual({
			path: ['white'],
			hex: '#ffffff',
		});
	});

	it('extracts semantic colors for dark mode from :root, .theme-dark block', () => {
		const result = parseThemeCss(sample);
		expect(result.semanticColors).toContainEqual({
			path: ['background'],
			mode: 'dark',
			hex: '#101010',
		});
		expect(result.semanticColors).toContainEqual({
			path: ['foreground'],
			mode: 'dark',
			hex: '#ffffff',
		});
		expect(result.semanticColors).toContainEqual({
			path: ['primary'],
			mode: 'dark',
			hex: '#c5ff24',
		});
		expect(result.semanticColors).toContainEqual({
			path: ['primary-foreground'],
			mode: 'dark',
			hex: '#000000',
		});
	});

	it('extracts semantic colors for light mode from .theme-light block', () => {
		const result = parseThemeCss(sample);
		expect(result.semanticColors).toContainEqual({
			path: ['background'],
			mode: 'light',
			hex: '#efefef',
		});
		expect(result.semanticColors).toContainEqual({
			path: ['primary'],
			mode: 'light',
			hex: '#ff002b',
		});
	});

	it('skips internal computation seeds --spacing and --radius', () => {
		const result = parseThemeCss(sample);
		const allPaths = [
			...result.primitives.map((p) => p.path.join('.')),
			...result.semanticColors.map((p) => p.path.join('.')),
			...result.fluidTokens.map((p) => p.path.join('.')),
			...result.scalarTokens.map((p) => p.path.join('.')),
		];
		expect(allPaths).not.toContain('spacing');
		expect(allPaths).not.toContain('radius');
		expect(allPaths.some((p) => p === 'radius.base')).toBe(false);
	});

	it('handles hsl(H, S%, L%) comma form as well as space form', () => {
		const result = parseThemeCss(sample);
		const lightPrimary = result.semanticColors.find(
			(c) => c.path[0] === 'primary' && c.mode === 'light'
		);
		expect(lightPrimary?.hex).toBe('#ff002b');
	});

	it('silently suppresses hsl(var(--color-*)) Tailwind palette refs (no warning)', () => {
		const sample = `
			:root,
			.theme-dark {
				--info: hsl(var(--color-sky-300));
			}
		`;
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = parseThemeCss(sample);
		expect(result.semanticColors.find((c) => c.path[0] === 'info')).toBeUndefined();
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe('parseTailwindCss', () => {
	const sample = `
		@theme static {
			--text-heading-xl: utopia.clamp(60, 120);
			--text-body-sm: utopia.clamp(14, 16);
			--spacing-md: utopia.clamp(32, 64);
			--spacing-v-base: utopia.clamp(16, 40);
			--breakpoint-2xs: 340px;
			--breakpoint-xs: 480px;
			--transition-duration-fast: 0.2s;
			--transition-duration: 0.4s;
			--ease: cubic-bezier(0.645, 0.045, 0.355, 1);
			--z-index-modal: 200;
			--z-index: 0;
			--tracking-tight: -0.025em;
			--leading-tighter: 1.1;
			--font-weight-bolder: 750;
			--aspect-desktop: 16 / 9;
		}

		@theme inline {
			--font-heading: var(--font-sans);
			--color-background: var(--background);
			--radius-xs: calc(var(--radius) - 0.375rem);
			--radius-lg: var(--radius);
			--radius-fluid: utopia.clamp(4, 8);
			--radius-fluid-xs: utopia.clamp(2, 4);
		}
	`;

	it('extracts fluid spacing tokens with spacing type', () => {
		const result = parseTailwindCss(sample);
		const md = result.fluidTokens.find((t) => t.path.join('.') === 'spacing.md');
		expect(md).toBeDefined();
		expect(md?.type).toBe('spacing');
		expect(md?.fluid).toEqual({
			mobile: 32,
			tablet: 43,
			laptop: 57,
			desktop: 64,
		});
	});

	it('extracts vertical spacing under spacing.v.* path', () => {
		const result = parseTailwindCss(sample);
		const vBase = result.fluidTokens.find((t) => t.path.join('.') === 'spacing.v.base');
		expect(vBase).toBeDefined();
		expect(vBase?.fluid.mobile).toBe(16);
		expect(vBase?.fluid.desktop).toBe(40);
	});

	it('extracts text-* size tokens as sizing fluid tokens', () => {
		const result = parseTailwindCss(sample);
		const headingXl = result.fluidTokens.find((t) => t.path.join('.') === 'text.heading-xl');
		expect(headingXl).toBeDefined();
		expect(headingXl?.type).toBe('sizing');
		expect(headingXl?.fluid.mobile).toBe(60);
		expect(headingXl?.fluid.desktop).toBe(120);
	});

	it('extracts scalar breakpoints as sizing scalars', () => {
		const result = parseTailwindCss(sample);
		expect(result.scalarTokens).toContainEqual({
			path: ['breakpoint', 'xs'],
			type: 'sizing',
			value: '480px',
		});
		expect(result.scalarTokens).toContainEqual({
			path: ['breakpoint', '2xs'],
			type: 'sizing',
			value: '340px',
		});
	});

	it('suppresses transition duration tokens (Figma cannot represent CSS animations)', () => {
		const result = parseTailwindCss(sample);
		expect(result.scalarTokens.find((t) => t.path[0] === 'transition-duration')).toBeUndefined();
	});

	it('suppresses cubic-bezier ease tokens (Figma cannot represent CSS animations)', () => {
		const result = parseTailwindCss(sample);
		expect(result.scalarTokens.find((t) => t.path.join('.') === 'ease')).toBeUndefined();
	});

	it('extracts z-index modal and treats bare --z-index as core.z-index.default', () => {
		const result = parseTailwindCss(sample);
		expect(result.scalarTokens).toContainEqual({
			path: ['z-index', 'modal'],
			type: 'number',
			value: '200',
		});
		expect(result.scalarTokens).toContainEqual({
			path: ['z-index', 'default'],
			type: 'number',
			value: '0',
		});
	});

	it('extracts tracking, leading, font-weight (nested under font/) and aspect', () => {
		const result = parseTailwindCss(sample);
		expect(result.scalarTokens).toContainEqual({
			path: ['font', 'tracking', 'tight'],
			type: 'letterSpacing',
			value: '-0.025em',
		});
		expect(result.scalarTokens).toContainEqual({
			path: ['font', 'leading', 'tighter'],
			type: 'lineHeights',
			value: '1.1',
		});
		expect(result.scalarTokens).toContainEqual({
			path: ['font', 'font-weight', 'bolder'],
			type: 'fontWeights',
			value: '750',
		});
		expect(result.scalarTokens).toContainEqual({
			path: ['aspect', 'desktop'],
			type: 'other',
			value: '16 / 9',
		});
	});

	it('ignores @theme inline aliases that reference var(--x) or calc()', () => {
		// @theme inline entries that use var()/calc() are CSS-only indirection
		// (Tailwind's color-* namespace, radius-* calc deltas). Skip them.
		// Clean utopia.clamp() values inside @theme inline ARE extracted (see next test).
		const result = parseTailwindCss(sample);
		const aliasPaths = [
			...result.primitives.map((p) => p.path.join('.')),
			...result.semanticColors.map((p) => p.path.join('.')),
			...result.fluidTokens.map((p) => p.path.join('.')),
			...result.scalarTokens.map((p) => p.path.join('.')),
		];
		expect(aliasPaths).not.toContain('font.heading');
		expect(aliasPaths).not.toContain('color.background');
	});

	it('extracts clean utopia.clamp() values from @theme inline (e.g. radius-fluid)', () => {
		const result = parseTailwindCss(sample);
		const fluid = result.fluidTokens.find((t) => t.path.join('.') === 'radius.fluid');
		expect(fluid).toBeDefined();
		expect(fluid?.type).toBe('borderRadius');
		expect(fluid?.fluid.mobile).toBe(4);
		expect(fluid?.fluid.desktop).toBe(8);

		const fluidXs = result.fluidTokens.find((t) => t.path.join('.') === 'radius.fluid-xs');
		expect(fluidXs).toBeDefined();
		expect(fluidXs?.fluid.mobile).toBe(2);
		expect(fluidXs?.fluid.desktop).toBe(4);
	});
});

describe('parseTypographyCss', () => {
	const sample = `
		@utility heading-xl {
			font-size: utopia.clamp(40, 128);
			line-height: 0.9;
			letter-spacing: -0.025em;
		}

		@utility text-body {
			font-size: utopia.clamp(16, 20);
			line-height: 1.6;
		}

		@utility heading-display {
			font-size: utopia.clamp(40, 84);
			line-height: 1.1;
			letter-spacing: -0.025em;
			font-weight: 550;
		}

		@utility text-micro {
			font-size: 12px;
			line-height: 1.1;
		}
	`;

	it('extracts fluid font-size, line-height, letter-spacing', () => {
		const result = parseTypographyCss(sample);
		const title = result.typography.find((t) => t.name === 'heading-xl');
		expect(title).toBeDefined();
		expect(title?.fontSize).toEqual({
			mobile: 40,
			tablet: 71,
			laptop: 109,
			desktop: 128,
		});
		expect(title?.lineHeight).toBe('0.9');
		expect(title?.letterSpacing).toBe('-0.025em');
		expect(title?.fontWeight).toBeUndefined();
	});

	it('extracts font-weight when present', () => {
		const result = parseTypographyCss(sample);
		const menu = result.typography.find((t) => t.name === 'heading-display');
		expect(menu?.fontWeight).toBe('550');
	});

	it('treats fixed font-size (no clamp) as same value across all 4 modes', () => {
		const result = parseTypographyCss(sample);
		const xxs = result.typography.find((t) => t.name === 'text-micro');
		expect(xxs?.fontSize).toEqual({
			mobile: 12,
			tablet: 12,
			laptop: 12,
			desktop: 12,
		});
	});

	it('skips utilities not matching heading-* / text-* prefixes', () => {
		const irrelevant = `
			@utility u-animate {
				transition: opacity 0.3s linear;
			}
			@utility f-steady {
				font-family: var(--font-steady);
			}
		`;
		const result = parseTypographyCss(irrelevant);
		expect(result.typography).toEqual([]);
	});
});

describe('parseThemeCss with resolver — cross-file resolution', () => {
	it('resolves --scrollbar: hsl(var(--background)) to per-mode hex', () => {
		const theme = `
			:root {
				--dark-900: 0 0% 6.2%;
				--light-900: 0 0% 93.8%;
			}
			:root,
			.theme-dark {
				--background: hsl(0 0% 6.2%);
				--scrollbar: hsl(var(--background));
			}
			.theme-light {
				--background: hsl(0 0% 93.8%);
				--scrollbar: hsl(var(--background));
			}
		`;
		const resolver = buildResolver({ theme, tailwind: '', typography: '' });
		const result = parseThemeCss(theme, resolver);
		expect(result.semanticColors).toContainEqual({
			path: ['scrollbar'],
			mode: 'dark',
			hex: '#101010',
		});
		expect(result.semanticColors).toContainEqual({
			path: ['scrollbar'],
			mode: 'light',
			hex: '#efefef',
		});
	});

	it('explicitly suppresses Tailwind palette refs without warning', () => {
		const theme = `
			:root,
			.theme-dark {
				--info: hsl(var(--color-sky-300));
			}
		`;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const resolver = buildResolver({ theme, tailwind: '', typography: '' });
		const result = parseThemeCss(theme, resolver);
		expect(result.semanticColors.find((c) => c.path[0] === 'info')).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('parseTailwindCss with resolver — animation suppression', () => {
	it('suppresses --transition-duration-* and --ease without warning', () => {
		const tailwind = `
			@theme static {
				--transition-duration-fast: 0.2s;
				--ease: cubic-bezier(0.165, 0.84, 0.44, 1);
				--theme-transition-duration: 0.3s;
				--theme-transition-easing: var(--ease);
			}
		`;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = parseTailwindCss(tailwind, resolver);
		expect(
			result.scalarTokens.find((t) => t.path.join('.').startsWith('transition'))
		).toBeUndefined();
		expect(result.scalarTokens.find((t) => t.path[0] === 'ease')).toBeUndefined();
		expect(
			result.scalarTokens.find((t) => t.path.join('.').startsWith('theme-transition'))
		).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('parseTailwindCss — container fraction routing', () => {
	it('routes --spacing-{whole,half,...} to responsive/container/<name>', () => {
		const tailwind = `
			@theme static {
				--spacing-gutter: utopia.clamp(16, 24);
				--spacing-margin: utopia.clamp(16, 40);
				--spacing-whole: calc(utopia.clamp(360, 1536) - var(--spacing-margin) * 2);
				--spacing-half: calc((var(--spacing-whole) - var(--spacing-gutter)) / 2);
				--spacing-whole-half: utopia.clamp(328, 716);
			}
		`;
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = parseTailwindCss(tailwind, resolver);
		const whole = result.fluidTokens.find((t) => t.path.join('.') === 'container.whole');
		expect(whole).toBeDefined();
		expect(whole?.fluid).toEqual({ mobile: 328, tablet: 720, laptop: 1210, desktop: 1456 });
		const half = result.fluidTokens.find((t) => t.path.join('.') === 'container.half');
		expect(half).toBeDefined();
		expect(half?.fluid).toEqual({ mobile: 156, tablet: 351, laptop: 594, desktop: 716 });
		const pair = result.fluidTokens.find((t) => t.path.join('.') === 'container.whole-half');
		expect(pair).toBeDefined();
		// utopia.clamp(328, 716) at 360→1536 anchor: tablet 463, laptop 631
		expect(pair?.fluid.mobile).toBe(328);
		expect(pair?.fluid.desktop).toBe(716);
	});

	it('does not collide with existing spacing tier names', () => {
		const tailwind = `
			@theme static {
				--spacing-md: utopia.clamp(24, 40);
				--spacing-md-lg: utopia.clamp(24, 64);
			}
		`;
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = parseTailwindCss(tailwind, resolver);
		expect(result.fluidTokens.find((t) => t.path.join('.') === 'spacing.md')).toBeDefined();
		expect(
			result.fluidTokens.find((t) => t.path.join('.') === 'spacing.pairs.md-lg')
		).toBeDefined();
		expect(result.fluidTokens.find((t) => t.path[0] === 'container')).toBeUndefined();
	});
});

describe('parseTailwindCss with resolver — calc resolution', () => {
	it('extracts calc-resolved fluid radius (e.g. radius.xs)', () => {
		const tailwind = `
			@theme static {
				--radius-base: utopia.clamp(6, 12);
			}
			@theme inline {
				--radius-xs: calc(var(--radius-base) - 0.375rem);
			}
		`;
		const baseResolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = parseTailwindCss(tailwind, baseResolver);
		const xs = result.fluidTokens.find((t) => t.path.join('.') === 'radius.xs');
		expect(xs).toBeDefined();
		expect(xs?.type).toBe('borderRadius');
		// radius-base at 360 anchor: { mobile: 6, tablet: 8, laptop: 11, desktop: 12 }
		// minus 6px (0.375rem): { mobile: 0, tablet: 2, laptop: 5, desktop: 6 }
		expect(xs?.fluid.mobile).toBe(0);
		expect(xs?.fluid.desktop).toBe(6);
	});

	it('resolves bare var(--radius-base) to fluid in @theme inline (radius.lg)', () => {
		const tailwind = `
			@theme static {
				--radius-base: utopia.clamp(6, 12);
			}
			@theme inline {
				--radius-lg: var(--radius-base);
			}
		`;
		const baseResolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = parseTailwindCss(tailwind, baseResolver);
		const lg = result.fluidTokens.find((t) => t.path.join('.') === 'radius.lg');
		expect(lg).toBeDefined();
		expect(lg?.fluid.mobile).toBe(6);
		expect(lg?.fluid.desktop).toBe(12);
	});
});
