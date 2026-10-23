import { describe, expect, it, vi } from 'vitest';
import { parseFontConfig } from '../font-config';

describe('parseFontConfig', () => {
	it('extracts a single font entry', () => {
		const config = `
			fonts: [
				{
					provider: fontProviders.local(),
					name: 'Innovator Grotesk',
					cssVariable: '--font-sans',
					fallbacks: ['sans-serif'],
				},
			],
		`;
		const result = parseFontConfig(config);
		expect(result.get('--font-sans')).toBe('Innovator Grotesk');
	});

	it('extracts multiple font entries', () => {
		const config = `
			fonts: [
				{ name: 'Innovator Grotesk', cssVariable: '--font-sans' },
				{ name: 'JetBrains Mono', cssVariable: '--font-mono' },
				{ name: 'Odd', cssVariable: '--font-odd' },
			],
		`;
		const result = parseFontConfig(config);
		expect(result.get('--font-sans')).toBe('Innovator Grotesk');
		expect(result.get('--font-mono')).toBe('JetBrains Mono');
		expect(result.get('--font-odd')).toBe('Odd');
		expect(result.size).toBe(3);
	});

	it('handles double-quoted strings', () => {
		const config = `
			fonts: [
				{ name: "Inter", cssVariable: "--font-sans" },
			],
		`;
		const result = parseFontConfig(config);
		expect(result.get('--font-sans')).toBe('Inter');
	});

	it('returns empty map when no fonts block found', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = parseFontConfig('export default defineConfig({ output: "static" })');
		expect(result.size).toBe(0);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('returns empty map on malformed entries', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const config = `fonts: [{ name: 'X' }],`; // missing cssVariable
		const result = parseFontConfig(config);
		expect(result.size).toBe(0);
		warn.mockRestore();
	});
});
