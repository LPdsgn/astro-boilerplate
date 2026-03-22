/**
 * Utility function to estimate reading time in minutes based on words count
 * @param html The HTML content to estimate reading time for.
 * @returns A string representing the estimated reading time.
 */
export function readingTime(html: string) {
	const textOnly = html.replace(/<[^>]+>/g, '');
	const wordCount = textOnly.split(/\s+/).length;
	const readingTimeMinutes = (wordCount / 200 + 1).toFixed();
	return `${readingTimeMinutes} min read`;
}

/**
 * Returns a formatted date string for a given Date object.
 * @param date The Date object to format.
 * @returns A formatted date string.
 */
export function formatDate(date: Date) {
	return Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(date);
}

/**
 * Helper function to determine if a nav item has children.
 * @param item The nav item to check.
 * @returns A boolean indicating if the item has children.
 */
export const menuItemhasChildren = (item: Links) => item.CHILDREN && item.CHILDREN.length > 0;
