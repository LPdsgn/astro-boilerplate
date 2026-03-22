import { Scroll, Transitions, init } from '@lib/classes';
import { AM, mm } from '@lib/animations';

// Initialize the Transitions class
export const transitions = new Transitions();
transitions.init();

// Initialize AnimationManager with Swup instance
// Must happen after Transitions.init() so Swup is available
if (transitions.swup) {
	AM.init(transitions.swup);
} else {
	AM.isDebug && AM.log('⚠️ Swup instance not available for AnimationManager');
}

// Initialize the Scroll class
Scroll.init();

if (import.meta.env.DEV) {
	// Dynamically import the grid-helper only in development mode
	import('@locomotivemtl/grid-helper')
		.then(({ default: GridHelper }) => {
			new GridHelper({
				columns: 'var(--grid-columns)',
				gutterWidth: `var(--spacing-gutter)`,
				marginWidth: `var(--spacing-gutter)`,
			});
		})
		.catch((error) => {
			console.error('Failed to load the grid helper:', error);
		});

	console.log('🫱🏼‍🫲🏽 App initialized');
}

document.addEventListener('page:before-swap', () => {
	mm.revert(); // Clear stale matchMedia callbacks before re-registering
});
