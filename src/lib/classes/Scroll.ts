import { $scroll } from '@lib/stores/scroll';

import LocomotiveScroll, {
	type ILenisScrollToOptions,
	type lenisTargetScrollTo,
} from 'locomotive-scroll';

export class Scroll {
	static locomotiveScroll: LocomotiveScroll;

	// =============================================================================
	// Lifecycle
	// =============================================================================
	static init() {
		Scroll.locomotiveScroll = new LocomotiveScroll({
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
	}

	static destroy() {
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
