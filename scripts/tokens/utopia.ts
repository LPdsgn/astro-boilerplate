import type { FluidModes } from './schema';

const VIEWPORT_MIN = 360;
const VIEWPORT_MAX = 1536;

const MODE_VIEWPORTS = {
	mobile: 320,
	tablet: 768,
	laptop: 1280,
	desktop: 1536,
} as const;

/**
 * Interpolate a Utopia clamp(min, max) declaration into per-viewport-mode integer px values.
 * Linear interpolation between the Utopia anchors 360 → 1536, rounded to integer pixels.
 */
export function interpolateClamp(min: number, max: number): FluidModes {
	const range = VIEWPORT_MAX - VIEWPORT_MIN;
	const slope = (max - min) / range;
	const at = (viewport: number) => {
		if (viewport <= VIEWPORT_MIN) return min;
		if (viewport >= VIEWPORT_MAX) return max;
		return min + slope * (viewport - VIEWPORT_MIN);
	};
	return {
		mobile: Math.round(at(MODE_VIEWPORTS.mobile)),
		tablet: Math.round(at(MODE_VIEWPORTS.tablet)),
		laptop: Math.round(at(MODE_VIEWPORTS.laptop)),
		desktop: Math.round(at(MODE_VIEWPORTS.desktop)),
	};
}
