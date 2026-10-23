import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function extractFontsBlock(content: string): string | null {
	const match = content.match(/fonts\s*:\s*\[/);
	if (!match) return null;
	const startIndex = (match.index ?? 0) + match[0].length;
	let depth = 1;
	let i = startIndex;
	while (i < content.length && depth > 0) {
		const c = content[i];
		if (c === '[') depth++;
		else if (c === ']') depth--;
		i++;
	}
	return content.slice(startIndex, i - 1);
}

export function parseFontConfig(content: string): Map<string, string> {
	const result = new Map<string, string>();
	const block = extractFontsBlock(content);
	if (!block) {
		console.warn(`[tokens:font-config] No fonts: [...] block found in config.`);
		return result;
	}

	// Walk the array body extracting each top-level { ... } entry, then read name + cssVariable.
	const entries: string[] = [];
	let depth = 0;
	let current = '';
	let inEntry = false;
	for (let i = 0; i < block.length; i++) {
		const c = block[i];
		if (c === '{') {
			depth++;
			inEntry = true;
		}
		if (inEntry) current += c;
		if (c === '}') {
			depth--;
			if (depth === 0 && inEntry) {
				entries.push(current);
				current = '';
				inEntry = false;
			}
		}
	}

	for (const entry of entries) {
		const nameMatch = entry.match(/name\s*:\s*['"]([^'"]+)['"]/);
		const varMatch = entry.match(/cssVariable\s*:\s*['"]([^'"]+)['"]/);
		if (nameMatch && varMatch) {
			result.set(varMatch[1], nameMatch[1]);
		}
	}
	return result;
}

export function readFontConfig(repoRoot: string): Map<string, string> {
	const candidates = ['astro.config.ts', 'astro.config.mjs', 'astro.config.js'];
	for (const c of candidates) {
		const path = resolve(repoRoot, c);
		try {
			const content = readFileSync(path, 'utf-8');
			return parseFontConfig(content);
		} catch {
			continue;
		}
	}
	console.warn(`[tokens:font-config] No astro.config.* file found in ${repoRoot}.`);
	return new Map();
}
