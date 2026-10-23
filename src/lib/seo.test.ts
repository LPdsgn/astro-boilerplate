import { describe, expect, it } from 'vitest';
import { getContentSEO } from './seo';

describe('getContentSEO', () => {
	it('passes the entry canonical and a string image through', () => {
		const seo = getContentSEO({
			data: {
				title: 'Getting started',
				summary: 'A short description',
				thumbnail: 'https://example.xyz/cover.png',
				canonical: 'https://example.xyz/blog/getting-started',
			},
			collection: 'blog',
		});

		expect(seo).toMatchObject({
			title: 'Getting started',
			description: 'A short description',
			image: 'https://example.xyz/cover.png',
			canonical: 'https://example.xyz/blog/getting-started',
		});
	});
});
