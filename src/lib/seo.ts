/**
 * Centralized SEO utilities
 *
 * Provides type-safe SEO meta generation with smart defaults and
 * automatic OG image generation via /api/og.png endpoint.
 *
 * Based on lpdsgn-astro SEO system, adapted for astro-boilerplate-new
 */

import { isProd, SITE } from '@/site.config';
import type { Props as SEOProps } from 'astro-seo';

// Re-export SEOProps for convenience
export type { SEOProps };

/**
 * Build complete SEO props from partial input
 *
 * @param seo - Partial SEO metadata from page
 * @param url - Current page URL (Astro.url)
 * @returns Full SEO props ready for astro-seo component
 *
 * @example
 * ```astro
 * ---
 * import { getSeo } from '@lib/utils/seo'
 * const seo = getSeo({ title: 'About', description: 'About page' }, Astro.url)
 * ---
 * <SEO {...seo} />
 * ```
 */
export function getSeo(seo: Partial<Seo>, url: URL): SEOProps {
	const title = seo.title || SITE.default.title;
	const fullTitle = `${title} | ${SITE.default.title}`;
	const description = seo.description || SITE.default.description;
	const canonical = seo.canonical || url.href;

	// Determine OG image: custom > dynamic (default) > static fallback
	// Dynamic OG is the default unless explicitly disabled or custom image provided
	const ogImageUrl =
		seo.image ||
		(seo.dynamicOgImage !== false ? buildOGImageUrl(url, title, description) : null) ||
		SITE.default.image;

	return {
		title: fullTitle,
		description,
		canonical,
		noindex: seo.noindex,
		nofollow: seo.nofollow,
		openGraph: {
			basic: {
				title: fullTitle,
				type: seo.type || 'website',
				image: ogImageUrl,
				url: canonical,
			},
			optional: {
				description,
				siteName: SITE.default.title,
			},
			...(seo.type === 'article' &&
				seo.publishedTime && {
					article: {
						publishedTime: seo.publishedTime.toISOString(),
						authors: seo.author ? [seo.author] : undefined,
					},
				}),
		},
		twitter: {
			title: fullTitle,
			description,
			card: 'summary_large_image',
			image: ogImageUrl,
			creator: seo.author || SITE.default.author,
		},
		extend: {
			meta: [
				{ name: 'title', content: title },
				{
					name: 'robots',
					content: `${seo.noindex ? 'noindex' : 'index'}, ${seo.nofollow ? 'nofollow' : 'follow'}`,
				},
			],
		},
	};
}

/**
 * Build dynamic OG image URL using /api/og.png endpoint
 *
 * @param baseUrl - Base URL to construct absolute path
 * @param title - Title for OG image
 * @param description - Description for OG image
 * @returns Absolute URL to dynamic OG image
 */
export function buildOGImageUrl(baseUrl: URL, title: string, description?: string): string {
	const ogUrl = new URL('/api/og.png', isProd ? SITE.siteUrl : baseUrl.origin);
	ogUrl.searchParams.set('title', title);
	if (description) {
		ogUrl.searchParams.set('description', description);
	}
	return ogUrl.toString();
}

/**
 * Helper to extract SEO meta from content collection entry
 *
 * @param entry - Content collection entry (works, blog, etc.)
 * @returns SEOMeta object ready for buildSEO()
 *
 * @example
 * ```astro
 * ---
 * import { buildSEO, getContentSEO } from '@/lib/seo'
 * const seo = buildSEO(getContentSEO(post), Astro.url)
 * ---
 * ```
 */
export function getContentSEO(entry: {
	data: {
		title: string;
		description?: string;
		summary?: string;
		ogImage?: { src: string };
		thumbnail?: { src: string };
		cover?: { src: string };
		date?: Date;
		publishDate?: Date;
		noindex?: boolean;
	};
	collection?: string;
}): Partial<Seo> {
	const { data, collection } = entry;

	// Determine description: prefer description, fallback to summary
	const description = data.description || data.summary;

	// Determine image: prefer ogImage, fallback to thumbnail/cover
	const image = data.ogImage?.src || data.thumbnail?.src || data.cover?.src;

	// Determine type based on collection
	const type = collection === 'blog' ? 'article' : 'website';

	// Determine publish date
	const publishedTime = data.date || data.publishDate;

	return {
		title: data.title,
		description,
		image,
		type,
		publishedTime,
		noindex: data.noindex,
	};
}

/**
 * Simple page SEO helper for static pages
 *
 * @param title - Page title
 * @param description - Optional description
 * @returns SEOMeta object
 *
 * @example
 * ```astro
 * ---
 * import { buildSEO, pageSEO } from '@/lib/seo'
 * const seo = buildSEO(pageSEO('Works', 'Browse my portfolio'), Astro.url)
 * ---
 * ```
 */
export function pageSEO(title: string, description?: string, dynamicOgImage = true): Partial<Seo> {
	return { title, description, dynamicOgImage };
}
