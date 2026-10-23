/**
 * Convert an HSL channel tuple string (as used in src/styles/theme.css primitives,
 * e.g. "0 0% 6.2%") to a 6-digit lowercase hex string like "#0f0f0f".
 */
export function hslChannelTupleToHex(input: string): string {
	const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
	if (!match) {
		throw new Error(`Invalid HSL channel tuple: "${input}"`);
	}
	const h = parseFloat(match[1]);
	const s = parseFloat(match[2]) / 100;
	const l = parseFloat(match[3]) / 100;
	return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (x: number) =>
		Math.round(x * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
