import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTokensJson } from '../extract';

const TOKENS_JSON = resolve(process.cwd(), 'tokens.json');

describe('extract pipeline — integration snapshot', () => {
	it('regenerates byte-for-byte identical to committed tokens.json', () => {
		const generated = buildTokensJson();
		const committed = readFileSync(TOKENS_JSON, 'utf-8');
		expect(generated).toBe(committed);
	});
});
