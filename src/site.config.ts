/**
 * Site configuration constant that defines various site-wide settings and metadata.
 *
 * @property {Object} default - Default site metadata
 * @property {string} siteUrl - The base URL of the website
 * @property {string} gtmID - Google Tag Manager ID (empty string if not set)
 * @property {string} clarityID - Microsoft Clarity ID (empty string if not set)
 */
export const SITE: Site = {
	default: {
		title: 'Astro Boilerplate',
		description: 'Boilerplate for Astro projects',
		image: '/_assets/og-lpdsgn-b.jpg',
		canonical: '',
		author: '@luigipdt',
	},
	siteUrl: 'https://example.xyz',
	analytics: {
		gtmID: '',
		clarityID: '',
		matomoURL: '',
		posthogID: '',
		posthogREG: '',
	},
};

/**
 * Array of navigation links for the application.
 *
 * @typedef {Object} Links - Represents a navigation link
 * @property {string} LABEL - Display text for the navigation link
 * @property {string} HREF - URL path for the navigation link
 * @property {Links[]} [CHILDREN] - Optional array of sub-navigation links
 */
export const NAV_LINKS: Links[] = [
	{
		LABEL: 'Index',
		HREF: '/',
	},
	{
		LABEL: 'Item 2',
		HREF: '/path',
		CHILDREN: [
			{
				LABEL: 'Sub-item',
				HREF: '/path/sub-path',
			},
		],
	},
];

// Global Social links
export const SOCIAL_LINKS: Links[] = [
	{
		LABEL: 'Email',
		HREF: 'mailto:mail@example.xyz',
	},
	{
		LABEL: 'Discord',
		HREF: 'https://discordapp.com/users/username',
	},
	{
		LABEL: 'Instagram',
		HREF: 'https://www.instagram.com/username/',
	},
	{
		LABEL: 'LinkedIn',
		HREF: 'https://www.linkedin.com/in/username/',
	},
	{
		LABEL: 'Behance',
		HREF: 'https://www.behance.net/username/',
	},
	{
		LABEL: 'GitHub',
		HREF: 'https://github.com/username/',
	},
];

// UtopiaClamp configuration
export const CONFIG: Config = Object.freeze({
	// Utopia
	utopia: {
		minViewport: 320,
		maxViewport: 1536,
		rootSize: 16,
	},
});
