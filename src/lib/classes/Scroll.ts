import { $scroll } from '@lib/stores/scroll';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import LocomotiveScroll, {
	type ILenisScrollToOptions,
	type lenisTargetScrollTo,
} from 'locomotive-scroll';

export class Scroll {
	static locomotiveScroll: LocomotiveScroll;
	private static heightObserver?: ResizeObserver;

	// =============================================================================
	// Lifecycle
	// =============================================================================
	static init() {
		Scroll.locomotiveScroll = new LocomotiveScroll({
			// Drive Lenis from GSAP's ticker: one RAF loop for scroll and animations
			initCustomTicker: (render) => {
				gsap.ticker.add(render);
			},
			destroyCustomTicker: (render) => {
				gsap.ticker.remove(render);
			},
			scrollCallback({ scroll, limit, velocity, direction, progress }) {
				$scroll.set({
					scroll,
					limit,
					velocity,
					direction,
					progress,
				});
			},
		});

		// Synchronize Lenis scrolling with GSAP's ScrollTrigger plugin
		Scroll.locomotiveScroll?.lenisInstance?.on('scroll', ScrollTrigger.update);

		// Disable lag smoothing in GSAP to prevent any delay in scroll animations
		gsap.ticker.lagSmoothing(0);

		// Content that settles after the triggers are measured (lazy media, fonts)
		// shifts everything below it: without a refresh, triggers start at stale positions
		let height = document.body.offsetHeight;
		let timer: ReturnType<typeof setTimeout>;
		Scroll.heightObserver = new ResizeObserver(() => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				if (document.body.offsetHeight === height) return;
				height = document.body.offsetHeight;
				ScrollTrigger.refresh();
			}, 150);
		});
		Scroll.heightObserver.observe(document.body);
	}

	static destroy() {
		Scroll.heightObserver?.disconnect();
		Scroll.locomotiveScroll?.destroy();
	}

	// =============================================================================
	// Methods
	// =============================================================================
	static start() {
		Scroll.locomotiveScroll?.start();
	}

	static stop() {
		Scroll.locomotiveScroll?.stop();
	}

	static addScrollElements(container: HTMLElement) {
		Scroll.locomotiveScroll?.addScrollElements(container);
	}

	static removeScrollElements(container: HTMLElement) {
		Scroll.locomotiveScroll?.removeScrollElements(container);
	}

	static scrollTo(target: lenisTargetScrollTo, options?: ILenisScrollToOptions) {
		Scroll.locomotiveScroll?.scrollTo(target, options);
	}
}
