import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// BLOG: a series is a folder, blog/<series>/index.md(x) is the parent and blog/<series>/<part>.md(x)
// its parts, ordered by `order` then date (src/lib/utils/blog.ts)
const blog = defineCollection({
	loader: glob({
		pattern: '**/[^_]*.{md,mdx}',
		base: './src/content/blog',
	}),
	schema: ({ image }) =>
		z.object({
			title: z
				.string()
				.max(60, 'Title should be 60 characters or less for optimal Open Graph display.'),
			description: z
				.string()
				.max(
					155,
					'Description should be 155 characters or less for optimal Open Graph display.'
				),
			date: z.coerce.date(),
			/** Position inside a series (blog/<series>/<part>.md); parents have none */
			order: z.number().optional(),
			cover: image().optional(),
			coverAlt: z.string().optional(),
			tags: z.array(z.string()).optional(),
			draft: z.boolean().optional().default(false),
		}),
});

// LEGAL
const legal = defineCollection({
	loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/legal' }),
	schema: z.object({
		draft: z.boolean().optional().default(false),
		title: z.string(),
		date: z.coerce.date(),
	}),
});

export const collections = {
	blog,
	legal,
};
