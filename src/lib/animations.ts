import { gsap } from 'gsap';
export { gsap } from 'gsap';

import { Flip } from 'gsap/Flip';
export { Flip } from 'gsap/Flip';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
export { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register only the essentials by default
gsap.registerPlugin(ScrollTrigger, Flip);

// Minimal matchMedia helper used across animations
export const mm = gsap.matchMedia();

/** Page-lifecycle GSAP contexts: setup/cleanup keyed by name, reverted on Swup swaps (gsap-encore, wired in app.ts) */
export { encore } from 'gsap-encore';
export { init } from '@lib/classes';

/**
 * Animation utilities for mouse tracking and position calculations
 * @module
 * @exports MousePosition - Type defining mouse coordinates
 * @exports getMousePos - Function to get current mouse position
 * @exports createMouseTracker - Function to create a mouse position tracker
 * @exports calculateDistance - Function to calculate distance between two points
 */
export {
	type MousePosition,
	lerp,
	getMousePos,
	createMouseTracker,
	calculateDistance,
	isInViewport,
} from '@lib/utils/ui';

export { isMobile, isTouchDevice, browserChecks } from '@lib/utils/devices';
