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

// Smooth anchor scrolling: replace Swup's link:anchor to use LocomotiveScroll
// Deferred to RAF so the animation runs outside Swup's synchronous callSync stack
if (transitions.swup) {
	const scrollEasing = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

	// Cross-page navigation: scroll to anchor after page transition
	// Double RAF ensures LocomotiveScroll has started (it defers start() to RAF)
	transitions.swup.hooks.replace('scroll:anchor', (_visit, { hash }) => {
		const id = hash?.replace(/^#/, '');
		const el = id ? document.getElementById(id) : null;
		if (el) {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					AM.isDebug && console.log('🔍 Cross-page anchor scroll:', { hash, id });
					Scroll.scrollTo(el, {
						duration: 0.5,
						easing: scrollEasing,
					});
				});
			});
			return true;
		}
		return false;
	});

	// Cross-page navigation: scroll to top (immediate, no animation flash)
	transitions.swup.hooks.replace('scroll:top', () => {
		window.scrollTo(0, 0);
		return true;
	});

	// Same-page navigation: smooth scroll to anchor via LocomotiveScroll
	transitions.swup.hooks.replace('link:anchor', (_visit, { hash }) => {
		const url = window.location.pathname + window.location.search;
		history.replaceState(history.state, '', url + hash);

		// Close mobile menu if open (Scroll.stop() removes the GSAP ticker, blocking scrollTo)
		const nav = document.querySelector<HTMLElement>('[data-navigation-status="active"]');
		if (nav) {
			nav.setAttribute('data-navigation-status', 'not-active');
			Scroll.start();
		}

		const id = hash?.replace(/^#/, '');
		const el = id ? document.getElementById(id) : null;
		if (el) {
			requestAnimationFrame(() => {
				const lenis = Scroll.locomotiveScroll?.lenisInstance;
				AM.isDebug &&
					console.log('🔍 Anchor scroll debug:', {
						el: el.id,
						locomotiveExists: !!Scroll.locomotiveScroll,
						lenisExists: !!lenis,
						isStopped: lenis?.isStopped,
						isLocked: lenis?.isLocked,
						limit: lenis?.limit,
						scroll: lenis?.scroll,
						targetScroll: lenis?.targetScroll,
						mobileMenuWasClosed: !!nav,
					});
				Scroll.scrollTo(el, {
					duration: 0.5,
					easing: scrollEasing,
				});
			});
		}
	});
}

if (import.meta.env.DEV) {
	// Dynamically import the grid-helper only in development mode
	import('@locomotivemtl/grid-helper')
		.then(({ default: GridHelper }) => {
			new GridHelper({
				columns: 'var(--grid-columns)',
				gutterWidth: `var(--spacing-gutter)`,
				marginWidth: `var(--spacing-margin)`,
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
