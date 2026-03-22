/**
 * Lightweight browser detection optimized for performance
 * Uses minimal user agent checks with feature detection fallback
 */

interface BrowserEngines {
	isWebKit: boolean;
	isGecko: boolean;
	isBlink: boolean;
	isWebKitNotBlink: boolean;
	isEdgeHTML: boolean;
}

let cachedEngines: BrowserEngines | null = null;

/**
 * Detects browser engines with caching for performance
 * @returns BrowserEngines object with all engine detection results
 */
export function detectBrowser(): BrowserEngines {
	if (cachedEngines !== null) return cachedEngines;

	const ua = navigator.userAgent;

	// Feature detection for engines
	const isGecko = typeof (window as any).InstallTrigger !== 'undefined';

	const isWebKit = Boolean(
		(window as any).webkitRequestAnimationFrame ||
		'WebkitAppearance' in document.documentElement.style
	);
	const isBlink =
		ua.includes('Chrome/') || ua.includes('Chromium/') || Boolean((window as any).chrome);

	const isWebKitNotBlink = isWebKit && !isBlink;

	const isEdgeHTML = ua.includes('Edge/') || Boolean((window as any).StyleMedia);

	return (cachedEngines = {
		isWebKit,
		isGecko,
		isBlink,
		isWebKitNotBlink,
		isEdgeHTML,
	});
}

/**
 * Conditional browser engine check with include/exclude filters
 * @param onlyEngines - Only check these specific engines (returns true if any match)
 * @param excludeEngines - Exclude these engines from check (returns true if any non-excluded engines match)
 * @returns true if conditions are met based on filter parameters
 */
export function checkBrowserEngines(
	options: {
		onlyEngines?: (keyof BrowserEngines)[];
		excludeEngines?: (keyof BrowserEngines)[];
	} = {}
): boolean {
	const { onlyEngines, excludeEngines } = options;
	const engines = detectBrowser();

	// If both parameters are provided, onlyEngines takes precedence
	if (onlyEngines && onlyEngines.length > 0) {
		return onlyEngines.some((engine) => engines[engine]);
	}

	if (excludeEngines && excludeEngines.length > 0) {
		const allowedEngines = (Object.keys(engines) as (keyof BrowserEngines)[]).filter(
			(engine) => !excludeEngines.includes(engine)
		);
		return allowedEngines.some((engine) => engines[engine]);
	}

	// If no filters provided, return true if any engine is detected
	return Object.values(engines).some(Boolean);
}

/**
 * Predefined browser checks for common use cases
 */
export const browserChecks = {
	/** Check if running on Firefox or Safari */
	isFirefoxOrSafari: () =>
		checkBrowserEngines({
			onlyEngines: ['isGecko', 'isWebKitNotBlink'],
		}),

	/** Check if running on Chromium-based browsers */
	isChromiumBased: () =>
		checkBrowserEngines({
			onlyEngines: ['isBlink'],
		}),

	/** Check if running on WebKit but not Chromium */
	isSafariLike: () =>
		checkBrowserEngines({
			onlyEngines: ['isWebKitNotBlink'],
		}),

	/** Check if running on modern browsers (exclude legacy Edge) */
	isModernBrowser: () =>
		checkBrowserEngines({
			excludeEngines: ['isEdgeHTML'],
		}),

	/** Check if running on any WebKit-based browser */
	isWebKitBased: () =>
		checkBrowserEngines({
			onlyEngines: ['isWebKit'],
		}),
} as const;

// Detects a mobile device
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
	navigator.userAgent
);

/**
 * Determines if the current device supports touch interactions.
 *
 * This constant checks for touch capability using three methods:
 * - Presence of the 'ontouchstart' property in the window object.
 * - The value of `navigator.maxTouchPoints` being greater than 0.
 * - The result of a media query for '(pointer: coarse)'.
 *
 * @returns {boolean} `true` if the device is likely a touch device, otherwise `false`.
 */
export const isTouchDevice =
	'ontouchstart' in window ||
	navigator.maxTouchPoints > 0 ||
	window.matchMedia('(pointer: coarse)').matches;
