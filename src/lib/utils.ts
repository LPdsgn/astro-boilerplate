// Content and query
export { getCleanSlug } from './utils/query';

// Data and formatting
export { formatDate, readingTime, menuItemhasChildren } from './utils/data';

// UI helpers
export {
	lerp,
	getMousePos,
	createMouseTracker,
	calculateDistance,
	isInViewport,
	getHeaderHeight,
	utopiaClamp,
} from './utils/ui';

// String helpers
export { toDash } from './utils/string';

// Note: devices.ts is excluded from barrel — it uses `navigator`/`window` at
// module level and cannot be imported during SSR. Import directly when needed:
// import { isMobile, isTouchDevice, ... } from '@/lib/utils/devices'

// Math utilities
export { mapRange, clamp, normalize, roundToDecimals } from './utils/maths';

// Note: setViewportSize is excluded from barrel — it uses `window` at module
// level and cannot be imported during SSR. Import it directly when needed:
// import { setViewportSize } from '@/lib/utils/setViewportSize'
