/** biome-ignore-all lint/correctness/noUnusedVariables: false positive */

/**
 * Interface representing a site configuration.
 * @property {Page} default - The default page configuration.
 * @property {string} siteUrl - The URL of the site.
 * @property {Object} analytics - Analytics configuration.
 * @property {string} [analytics.gtmId] - Optional Google Tag Manager ID.
 * @property {string} [analytics.clarityId] - Optional Microsoft Clarity ID.
 * @property {string} [analytics.posthogId] - Optional PostHog ID.
 */
interface Site {
	default: Seo;
	siteUrl: string;
	analytics?: {
		gtmId?: string;
		clarityId?: string;
		posthogId?: string;
		matomo?: {
			url?: string;
			siteId?: string;
		};
	};
}

/**
 * Represents a set of navigation links with optional nested children.
 *
 * @property {string} LABEL - Display text for the navigation link
 * @property {string} HREF - URL path for the navigation link
 * @property {Links[]} [CHILDREN] - Optional array of sub-navigation links
 */
interface Links {
	HREF: string;
	LABEL: string;
	CHILDREN?: Links[];
}

/**
 * SEO metadata input - what pages provide to getSeo()
 * Enhanced with dynamic OG image generation support
 *
 * @property {string} title - Page title (will be suffixed with site name)
 * @property {string} [description] - Page description for meta and OG
 * @property {string} [image] - Custom OG image URL (overrides dynamic generation)
 * @property {boolean} [dynamicOgImage] - Disable dynamic OG image generation (default: true)
 * @property {string} [canonical] - Canonical URL override
 * @property {boolean} [noindex] - Prevent indexing
 * @property {boolean} [nofollow] - Prevent following links
 * @property {'website' | 'article' | 'profile'} [type] - OG type
 * @property {Date} [publishedTime] - Article publish date (for type: article)
 * @property {string} [author] - Article author
 */
interface Seo {
	title: string;
	description: string;
	image: string;
	dynamicOgImage?: boolean;
	canonical?: string;
	noindex?: boolean;
	nofollow?: boolean;
	type?: 'website' | 'article' | 'profile';
	publishedTime?: Date;
	author?: string;
}

/**
 * Configuration for Utopia fluid design system
 * @property {Object} utopia - Utopia configuration
 * @property {number} utopia.minViewport - Minimum viewport width in pixels
 * @property {number} utopia.maxViewport - Maximum viewport width in pixels
 * @property {number} utopia.rootSize - Root font size in pixels
 */
interface Config {
	utopia: {
		minViewport: number;
		maxViewport: number;
		rootSize: number;
	};
}
