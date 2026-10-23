import { describe, expect, it } from 'vitest';
import { hslChannelTupleToHex } from '../color';

describe('hslChannelTupleToHex', () => {
	it('converts black and white extremes', () => {
		expect(hslChannelTupleToHex('0 0% 0%')).toBe('#000000');
		expect(hslChannelTupleToHex('0 0% 100%')).toBe('#ffffff');
	});

	it('converts grayscale tones (lightness only)', () => {
		expect(hslChannelTupleToHex('0 0% 6.2%')).toBe('#101010'); // dark-900
		expect(hslChannelTupleToHex('0 0% 93.8%')).toBe('#efefef'); // light-900
		expect(hslChannelTupleToHex('0 0% 30%')).toBe('#4d4d4d'); // dark-500
		expect(hslChannelTupleToHex('0 0% 77%')).toBe('#c4c4c4'); // muted-foreground
	});

	it('converts saturated primary green at 76°', () => {
		// primary-500: hsl(76, 100%, 57%)
		expect(hslChannelTupleToHex('76 100% 57%')).toBe('#c5ff24');
	});

	it('converts red error at 0°', () => {
		// error-500: hsl(0, 65%, 45%)
		expect(hslChannelTupleToHex('0 65% 45%')).toBe('#bd2828');
	});

	it('converts green success at 112°', () => {
		// success-500: hsl(112, 50%, 36%)
		expect(hslChannelTupleToHex('112 50% 36%')).toBe('#3a8a2e');
	});

	it('converts yellow warning at 45°', () => {
		// warning-500: hsl(45, 100%, 50%)
		expect(hslChannelTupleToHex('45 100% 50%')).toBe('#ffbf00');
	});

	it('trims surrounding whitespace', () => {
		expect(hslChannelTupleToHex('  0 0% 0%  ')).toBe('#000000');
	});

	it('throws on malformed input', () => {
		expect(() => hslChannelTupleToHex('not a tuple')).toThrow();
		expect(() => hslChannelTupleToHex('0 0 0')).toThrow(); // missing %
		expect(() => hslChannelTupleToHex('')).toThrow();
	});
});
