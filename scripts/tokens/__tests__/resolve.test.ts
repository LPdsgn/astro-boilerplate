import { describe, expect, it, vi } from 'vitest';
import { buildResolver } from '../resolve';

describe('buildResolver', () => {
	it('resolves a primitive HSL channel tuple in :root', () => {
		const theme = `
			:root {
				--dark-900: 0 0% 6.2%;
				--primary-500: 76 100% 57%;
			}
		`;
		const resolver = buildResolver({ theme, tailwind: '', typography: '' });
		expect(resolver.resolve('hsl(var(--dark-900))')).toBe('#101010');
		expect(resolver.resolve('hsl(var(--primary-500))')).toBe('#c5ff24');
	});

	it('resolves theme-aware semantic colors (light vs dark)', () => {
		const theme = `
			:root {
				--dark-900: 0 0% 6.2%;
				--light-900: 0 0% 93.8%;
			}
			:root,
			.theme-dark {
				--background: hsl(0 0% 6.2%);
			}
			.theme-light {
				--background: hsl(0 0% 93.8%);
			}
		`;
		const resolver = buildResolver({ theme, tailwind: '', typography: '' });
		expect(resolver.resolve('hsl(var(--background))', { mode: 'dark' })).toBe('#101010');
		expect(resolver.resolve('hsl(var(--background))', { mode: 'light' })).toBe('#efefef');
	});

	it('returns null for unresolvable vars and warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const resolver = buildResolver({ theme: '', tailwind: '', typography: '' });
		expect(resolver.resolve('hsl(var(--does-not-exist))')).toBe(null);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('resolves a fluid var(--spacing-md) → FluidModes', () => {
		const tailwind = `
			@theme static {
				--spacing-md: utopia.clamp(24, 40);
			}
		`;
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = resolver.resolveFluid('var(--spacing-md)');
		expect(result).toEqual({ mobile: 24, tablet: 30, laptop: 37, desktop: 40 });
	});

	it('resolves --spacing-gutter chained through resolveFluid', () => {
		const tailwind = `
			@theme static {
				--spacing-gutter: utopia.clamp(16, 24);
			}
		`;
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		const result = resolver.resolveFluid('var(--spacing-gutter)');
		expect(result?.mobile).toBe(16);
		expect(result?.desktop).toBe(24);
	});

	it('returns null when fluid lookup hits a non-fluid value', () => {
		const tailwind = `
			@theme static {
				--breakpoint-xs: 480px;
			}
		`;
		const resolver = buildResolver({ theme: '', tailwind, typography: '' });
		expect(resolver.resolveFluid('var(--breakpoint-xs)')).toBe(null);
	});

	it('aborts deep var chains at 8 hops and warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// Construct a 10-deep chain in :root.
		const lines = Array.from(
			{ length: 10 },
			(_, i) => `--chain-${i}: hsl(var(--chain-${i + 1}));`
		).join('\n');
		const theme = `:root { ${lines} --chain-10: 0 0% 0%; }`;
		const resolver = buildResolver({ theme, tailwind: '', typography: '' });
		expect(resolver.resolve('hsl(var(--chain-0))')).toBe(null);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('var() chain too deep'));
		warn.mockRestore();
	});

	it('returns null for non-var values (passthrough check is caller responsibility)', () => {
		const resolver = buildResolver({ theme: '', tailwind: '', typography: '' });
		expect(resolver.resolve('#ff0000')).toBe(null);
		expect(resolver.resolve('12px')).toBe(null);
	});
});
