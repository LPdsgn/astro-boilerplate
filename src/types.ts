/**
 * Interface representing a page with metadata.
 * @property {string} title - The title of the page.
 * @property {string} description - A description of the page content.
 * @property {string} image - URL or path to the page's featured image.
 * @property {string} [canonical] - Optional canonical URL for the page.
 * @property {string} [author] - Optional author of the page content.
 */
export type Page = {
   title: string
   description: string
   image: string
	canonical?: string
	author?: string
}

/**
 * Interface representing a site configuration.
 * @property {Page} default - The default page configuration.
 * @property {string} siteUrl - The URL of the site.
 * @property {string} [gtmID] - Optional Google Tag Manager ID.
 * @property {string} [clarityID] - Optional Microsoft Clarity ID.
 */
export interface Site {
	default: Page
	siteUrl: string
	gtmID?: string
	clarityID?: string
	matomoURL?: string
	posthogID?: string
	posthogREG?: string
}

/**
 * Represents a set of navigation links with optional nested children.
 *
 * @property {string} LABEL - Display text for the navigation link
 * @property {string} HREF - URL path for the navigation link
 * @property {Links[]} [CHILDREN] - Optional array of sub-navigation links
 */
export type Links = {
   HREF: string
   LABEL: string
   CHILDREN?: Links[]
}

/**
 * Represents configuration settings for the Utopia design system.
 *
 * @property {number} minViewport - Minimal viewport size in pixels.
 * @property {number} maxViewport - Maximal viewport size in pixels.
 * @property {number} rootSize - Base root font size used for responsive calculations.
 */
type UtopiaConfig = {
   minViewport: number
   maxViewport: number
   rootSize: number
}

/**
 * Represents the Utopia configuration object.
 * 
 * @property {UtopiaConfig} utopia - The Utopia configuration.
 */
export type Config = {
   utopia: UtopiaConfig
}