/**
 * Extracts the last segment of a URL path or returns the original string if no segments are found.
 *
 * @deprecated
 *
 * @param slug - The URL path or string to clean.
 * @returns The last segment of the URL path or the original string.
 */
export function getCleanSlug(slug: string): string {
	return slug.split('/').pop() || slug;
}
