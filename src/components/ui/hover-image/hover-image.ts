import { AM, gsap } from '@lib/animations';
import { getMousePos } from '@lib/utils/ui';

/**
 * Interface representing DOM elements used in hover animations.
 * @interface
 * @property {HTMLElement} el - The main element to apply the hover effect to
 * @property {HTMLDivElement} [reveal] - Optional container element for the reveal effect
 * @property {HTMLDivElement} [revealInner] - Optional inner element for the reveal animation
 * @property {HTMLDivElement} [revealImg] - Optional image container element for the reveal effect
 */
interface DOMElements {
	el: HTMLElement;
	reveal?: HTMLDivElement;
	revealInner?: HTMLDivElement;
	revealImg?: HTMLDivElement;
}

/**
 * Abstract base class for creating hover effects on elements with image reveal functionality.
 * Uses GSAP for animations and requires elements to have a data-img attribute.
 *
 * @abstract
 * @class BaseHoverEffect
 *
 * @property {DOMElements} DOM - Object containing references to DOM elements
 * @property {gsap.core.Timeline | null} tl - GSAP timeline for animations
 *
 * @example
 * ```typescript
 * class CustomHover extends BaseHoverEffect {
 *   protected positionElement(ev: MouseEvent): void {
 *     // Implementation for positioning the reveal element
 *   }
 * }
 *
 * const hover = new CustomHover(document.querySelector('.hover-element'));
 * ```
 *
 * @remarks
 * This class handles the creation of reveal elements, event binding, and animation logic.
 * Concrete implementations must provide positionElement method logic.
 *
 * @requires gsap - GreenSock Animation Platform library
 */
abstract class BaseHoverEffect {
	protected DOM: DOMElements;
	protected tl: gsap.core.Timeline | null;
	protected animationKey: string;

	constructor(el: HTMLElement) {
		this.DOM = { el };
		this.tl = null;
		// Genera una chiave univoca per l'animazione
		this.animationKey = `hover-${Math.random().toString(36).substring(2, 11)}`;
		this.setupDOM();
		this.initEvents();
	}

	protected setupDOM(): void {
		const reveal = document.createElement('div');
		reveal.className = 'c-hoverReveal';
		const imgPath = this.DOM.el.dataset.img;

		if (!imgPath) {
			console.error('No image path provided in data-img attribute');
			return;
		}

		reveal.innerHTML = `
         <div class="c-hoverReveal_inner">
            <div class="c-hoverReveal_img"></div>
         </div>
      `;

		this.DOM.el.appendChild(reveal);
		this.DOM.reveal = reveal;
		this.DOM.revealInner = reveal.querySelector('.c-hoverReveal_inner') as HTMLDivElement;
		this.DOM.revealImg = this.DOM.revealInner.querySelector(
			'.c-hoverReveal_img'
		) as HTMLDivElement;

		if (this.DOM.revealInner) {
			this.DOM.revealInner.style.overflow = 'hidden';
		}
	}

	protected initEvents(): void {
		this.mouseenterFn = this.mouseenterFn.bind(this);
		this.mousemoveFn = this.mousemoveFn.bind(this);
		this.mouseleaveFn = this.mouseleaveFn.bind(this);

		this.DOM.el.addEventListener('mouseenter', this.mouseenterFn);
		this.DOM.el.addEventListener('mousemove', this.mousemoveFn);
		this.DOM.el.addEventListener('mouseleave', this.mouseleaveFn);
	}

	protected mouseenterFn(ev: MouseEvent): void {
		this.positionElement(ev);
		this.showImage();
	}

	protected mousemoveFn(ev: MouseEvent): void {
		requestAnimationFrame(() => {
			this.positionElement(ev);
		});
	}

	protected mouseleaveFn(): void {
		this.hideImage();
	}

	protected abstract positionElement(ev: MouseEvent): void;

	/**
	 * Helper per mantenere l'elemento reveal dentro i bordi dello schermo
	 * @param targetTop - Posizione top desiderata
	 * @param targetLeft - Posizione left desiderata
	 * @returns Posizione aggiustata per rimanere dentro i bordi
	 */
	protected constrainToViewport(
		targetTop: number,
		targetLeft: number
	): { top: number; left: number } {
		if (!this.DOM.reveal) return { top: targetTop, left: targetLeft };

		const revealRect = this.DOM.reveal.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};

		// Calcola i limiti considerando le dimensioni dell'elemento
		const maxTop = viewport.height - revealRect.height - 10; // 10px di margine
		const maxLeft = viewport.width - revealRect.width - 10;
		const minTop = 10;
		const minLeft = 10;

		// Aggiusta le coordinate per rimanere dentro i limiti
		const constrainedTop = Math.max(minTop, Math.min(maxTop, targetTop));
		const constrainedLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));

		return {
			top: constrainedTop,
			left: constrainedLeft,
		};
	}

	protected showImage(): void {
		if (!this.DOM.reveal || !this.DOM.revealInner || !this.DOM.revealImg) return;

		gsap.killTweensOf(this.DOM.revealInner);
		gsap.killTweensOf(this.DOM.revealImg);

		// Imposta l'immagine di background al primo utilizzo usando l'URL ottimizzato in data-img
		const bg = this.DOM.el.dataset.img;
		if (bg && !this.DOM.revealImg.style.backgroundImage) {
			// Nota: il browser inizierà il fetch; evitare layout sync
			this.DOM.revealImg.style.backgroundImage = `url("${bg}")`;
		}

		this.tl = AM.timeline(`${this.animationKey}-show`, {
			onStart: () => {
				if (this.DOM.reveal) {
					this.DOM.reveal.style.opacity = '1';
					gsap.set(this.DOM.el, { zIndex: 1000 });
				}
			},
		})
			.add('begin')
			.add(
				gsap.to(this.DOM.revealInner, {
					duration: 0.4,
					ease: 'power4.out',
					startAt: { x: '-100%', y: '-100%' },
					x: '0%',
					y: '0%',
				}),
				'begin'
			)
			.add(
				gsap.to(this.DOM.revealImg, {
					duration: 0.4,
					ease: 'power4.out',
					startAt: { x: '100%', y: '100%' },
					x: '0%',
					y: '0%',
				}),
				'begin'
			);
	}

	protected hideImage(): void {
		if (!this.DOM.reveal || !this.DOM.revealInner || !this.DOM.revealImg) return;

		gsap.killTweensOf(this.DOM.revealInner);
		gsap.killTweensOf(this.DOM.revealImg);

		this.tl = AM.timeline(`${this.animationKey}-hide`, {
			onStart: () => {
				gsap.set(this.DOM.el, { zIndex: 999 });
			},
			onComplete: () => {
				gsap.set(this.DOM.el, { zIndex: '' });
				if (this.DOM.reveal) {
					gsap.set(this.DOM.reveal, { opacity: 0 });
				}
			},
		})
			.add('begin')
			.add(
				gsap.to(this.DOM.revealInner, {
					duration: 0.3,
					ease: 'power4.out',
					x: '100%',
					y: '100%',
				}),
				'begin'
			)
			.add(
				gsap.to(this.DOM.revealImg, {
					duration: 0.3,
					ease: 'power4.out',
					x: '-100%',
					y: '-100%',
				}),
				'begin'
			);
	}

	public destroy(): void {
		// Cleanup delle animazioni tramite AM
		AM.cleanup(`${this.animationKey}-show`);
		AM.cleanup(`${this.animationKey}-hide`);
		AM.cleanup(this.animationKey);

		this.DOM.el.removeEventListener('mouseenter', this.mouseenterFn);
		this.DOM.el.removeEventListener('mousemove', this.mousemoveFn);
		this.DOM.el.removeEventListener('mouseleave', this.mouseleaveFn);
	}
}

// Implementazioni specifiche degli effetti
class FollowCursorEffect extends BaseHoverEffect {
	protected positionElement(ev: MouseEvent): void {
		if (!this.DOM.reveal) return;

		const mousePos = getMousePos(ev);
		const docScrolls = {
			left: document.body.scrollLeft + document.documentElement.scrollLeft,
			top: document.body.scrollTop + document.documentElement.scrollTop,
		};

		const top = mousePos.y + 20 - docScrolls.top;
		const left = mousePos.x + 20 - docScrolls.left;

		const constrained = this.constrainToViewport(top, left);

		this.DOM.reveal.style.top = `${constrained.top}px`;
		this.DOM.reveal.style.left = `${constrained.left}px`;
	}
}

class CenteredCursorEffect extends BaseHoverEffect {
	protected positionElement(ev: MouseEvent): void {
		if (!this.DOM.reveal) return;

		const mousePos = getMousePos(ev);
		const docScrolls = {
			left: document.body.scrollLeft + document.documentElement.scrollLeft,
			top: document.body.scrollTop + document.documentElement.scrollTop,
		};
		const revealRect = this.DOM.reveal.getBoundingClientRect();
		const top = mousePos.y - revealRect.height / 2 - docScrolls.top;
		const left = mousePos.x - revealRect.width / 2 - docScrolls.left;

		const constrained = this.constrainToViewport(top, left);

		this.DOM.reveal.style.top = `${constrained.top}px`;
		this.DOM.reveal.style.left = `${constrained.left}px`;
	}
}

class FixedOffsetEffect extends BaseHoverEffect {
	protected positionElement(ev: MouseEvent): void {
		if (!this.DOM.reveal) return;

		const mousePos = getMousePos(ev);
		const docScrolls = {
			left: document.body.scrollLeft + document.documentElement.scrollLeft,
			top: document.body.scrollTop + document.documentElement.scrollTop,
		};
		// Fixed offset of 50px from cursor
		const top = mousePos.y + 50 - docScrolls.top;
		const left = mousePos.x + 50 - docScrolls.left;

		const constrained = this.constrainToViewport(top, left);

		this.DOM.reveal.style.top = `${constrained.top}px`;
		this.DOM.reveal.style.left = `${constrained.left}px`;
	}
}

class MirroredEffect extends BaseHoverEffect {
	protected positionElement(ev: MouseEvent): void {
		if (!this.DOM.reveal) return;

		const mousePos = getMousePos(ev);
		const docScrolls = {
			left: document.body.scrollLeft + document.documentElement.scrollLeft,
			top: document.body.scrollTop + document.documentElement.scrollTop,
		};
		// Mirrored position relative to cursor
		const top = mousePos.y - 20 - docScrolls.top;
		const left = mousePos.x - 20 - docScrolls.left;

		const constrained = this.constrainToViewport(top, left);

		this.DOM.reveal.style.top = `${constrained.top}px`;
		this.DOM.reveal.style.left = `${constrained.left}px`;
	}
}

export const HoverEffects = {
	Follow: FollowCursorEffect,
	Center: CenteredCursorEffect,
	Offset: FixedOffsetEffect,
	Mirror: MirroredEffect,
};
