import { AM, Flip, gsap } from '@lib/animations';
import { Scroll } from '@lib/classes/Scroll';
import '@styles/components/lightbox.css';

export interface LightboxOptions {
	galleryName?: string;
}

interface LightboxItem {
	src: string;
	caption?: string;
	trigger: HTMLElement;
}

const instances = new Set<Lightbox>();
let idCounter = 0;

export class Lightbox {
	private items: LightboxItem[] = [];
	private currentIndex = 0;
	private overlay: HTMLDivElement | null = null;
	private backdropEl: HTMLDivElement | null = null;
	private imgEl: HTMLImageElement | null = null;
	private captionEl: HTMLParagraphElement | null = null;
	private counterEl: HTMLSpanElement | null = null;
	private prevBtn: HTMLButtonElement | null = null;
	private nextBtn: HTMLButtonElement | null = null;
	private isOpen = false;
	private isAnimating = false;
	private returnFocusEl: HTMLElement | null = null;
	private boundKeydown = this.onKeydown.bind(this);
	private amKey: string;

	constructor() {
		this.amKey = `lightbox-${++idCounter}`;
	}

	// =========================================================================
	// Static API
	// =========================================================================

	static bind(container: HTMLElement, selector: string, _options?: LightboxOptions): Lightbox {
		const lb = new Lightbox();

		AM.setup(lb.amKey, (ctx) => {
			const triggers = container.querySelectorAll<HTMLElement>(selector);

			triggers.forEach((trigger, index) => {
				const src =
					trigger.getAttribute('data-lightbox-src') || trigger.getAttribute('href') || '';
				const caption = trigger.getAttribute('data-lightbox-caption') || '';

				lb.items.push({ src, caption, trigger });

				const handler = (e: Event) => {
					e.preventDefault();
					lb.open(index);
				};

				ctx?.add(() => {
					trigger.addEventListener('click', handler);
					return () => trigger.removeEventListener('click', handler);
				});
			});
		});

		instances.add(lb);
		return lb;
	}

	static destroyAll(): void {
		instances.forEach((lb) => lb.destroy());
		instances.clear();
	}

	// =========================================================================
	// Lifecycle
	// =========================================================================

	destroy(): void {
		this.forceClose();
		this.items = [];
		if (this.overlay) {
			this.overlay.remove();
			this.overlay = null;
		}
		instances.delete(this);
	}

	/** Close without animation — used during destroy / page swap */
	private forceClose(): void {
		document.removeEventListener('keydown', this.boundKeydown);
		if (this.imgEl) gsap.killTweensOf(this.imgEl);
		if (this.backdropEl) gsap.killTweensOf(this.backdropEl);
		if (this.overlay) this.overlay.setAttribute('data-state', 'closed');
		if (this.imgEl) gsap.set(this.imgEl, { clearProps: 'all' });
		if (this.backdropEl) gsap.set(this.backdropEl, { clearProps: 'all' });
		Scroll.start();
		document.body.classList.remove('overflow-hidden');
		this.isOpen = false;
		this.isAnimating = false;
	}

	// =========================================================================
	// Overlay DOM
	// =========================================================================

	private ensureOverlay(): void {
		if (this.overlay) return;

		const overlay = document.createElement('div');
		overlay.className = 'c-lightbox';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-label', 'Image lightbox');
		overlay.setAttribute('data-state', 'closed');

		overlay.innerHTML = `
			<div class="c-lightbox__backdrop"></div>
			<div class="c-lightbox__image-wrapper">
				<img class="c-lightbox__image" src="" alt="" />
			</div>
			<p class="c-lightbox__caption"></p>
			<nav class="c-lightbox__nav">
				<button class="c-lightbox__btn c-lightbox__prev" aria-label="Previous image">&larr; Prev</button>
				<span class="c-lightbox__counter"></span>
				<button class="c-lightbox__btn c-lightbox__next" aria-label="Next image">Next &rarr;</button>
				<button class="c-lightbox__btn c-lightbox__close" aria-label="Close lightbox">&times; Close</button>
			</nav>
		`;

		document.body.appendChild(overlay);
		this.overlay = overlay;
		this.backdropEl = overlay.querySelector('.c-lightbox__backdrop');
		this.imgEl = overlay.querySelector('.c-lightbox__image');
		this.captionEl = overlay.querySelector('.c-lightbox__caption');
		this.counterEl = overlay.querySelector('.c-lightbox__counter');
		this.prevBtn = overlay.querySelector('.c-lightbox__prev');
		this.nextBtn = overlay.querySelector('.c-lightbox__next');

		// Backdrop click
		this.backdropEl!.addEventListener('click', () => this.close());
		overlay.querySelector('.c-lightbox__image-wrapper')!.addEventListener('click', (e) => {
			if (e.target === e.currentTarget) this.close();
		});

		// Nav buttons
		this.prevBtn!.addEventListener('click', () => this.prev());
		this.nextBtn!.addEventListener('click', () => this.next());
		overlay.querySelector('.c-lightbox__close')!.addEventListener('click', () => this.close());
	}

	// =========================================================================
	// Open / Close
	// =========================================================================

	open(index: number): void {
		if (this.isOpen || this.isAnimating) return;
		if (index < 0 || index >= this.items.length) return;

		this.isAnimating = true;
		this.currentIndex = index;
		this.returnFocusEl = document.activeElement as HTMLElement;

		this.ensureOverlay();
		const item = this.items[index];
		const triggerImg = item.trigger.querySelector('img');

		// Set image src to high-res version
		this.imgEl!.src = item.src;
		this.imgEl!.alt = item.caption || '';
		this.updateUI();

		// Notify listeners (e.g. InfiniteGrid pause)
		document.dispatchEvent(new CustomEvent('lightbox:open'));

		// Lock scroll
		Scroll.stop();
		document.body.classList.add('overflow-hidden');

		// Show overlay (display: flex), image hidden until positioned
		this.overlay!.setAttribute('data-state', 'open');
		gsap.set(this.imgEl!, { opacity: 0 });
		gsap.fromTo(
			this.backdropEl!,
			{ opacity: 0 },
			{ opacity: 1, duration: 0.3, ease: 'power1.out' }
		);

		const onImageReady = () => {
			if (triggerImg) {
				// Use Flip.fit to snap lightbox image to trigger's visual position
				Flip.fit(this.imgEl!, triggerImg, { scale: true });
				gsap.set(this.imgEl!, { opacity: 1 });

				// Animate from trigger position to natural centered position
				gsap.to(this.imgEl!, {
					x: 0,
					y: 0,
					scaleX: 1,
					scaleY: 1,
					duration: 0.5,
					ease: 'power2.out',
					onComplete: () => this.onOpenComplete(),
				});
			} else {
				// No trigger image — simple fade in
				gsap.to(this.imgEl!, {
					opacity: 1,
					scale: 1,
					duration: 0.4,
					ease: 'power2.out',
					onStart: () => {
						gsap.set(this.imgEl!, { scale: 0.9 });
					},
					onComplete: () => this.onOpenComplete(),
				});
			}
		};

		// Wait for the high-res image to load so layout is correct
		if (this.imgEl!.complete && this.imgEl!.naturalWidth > 0) {
			onImageReady();
		} else {
			this.imgEl!.addEventListener('load', onImageReady, { once: true });
		}
	}

	private onOpenComplete(): void {
		this.isOpen = true;
		this.isAnimating = false;
		document.addEventListener('keydown', this.boundKeydown);
		this.overlay?.querySelector<HTMLButtonElement>('.c-lightbox__close')?.focus();
	}

	close(): void {
		if (!this.isOpen || this.isAnimating) return;

		this.isAnimating = true;
		document.removeEventListener('keydown', this.boundKeydown);

		const item = this.items[this.currentIndex];
		const triggerImg = item?.trigger.querySelector('img');

		const onDone = () => {
			this.overlay!.setAttribute('data-state', 'closed');
			gsap.set(this.imgEl!, { clearProps: 'all' });
			gsap.set(this.backdropEl!, { clearProps: 'all' });
			this.isOpen = false;
			this.isAnimating = false;

			// Unlock scroll
			Scroll.start();
			document.body.classList.remove('overflow-hidden');

			// Notify listeners (e.g. InfiniteGrid resume)
			document.dispatchEvent(new CustomEvent('lightbox:close'));

			// Return focus
			this.returnFocusEl?.focus();
		};

		// Fade backdrop
		gsap.to(this.backdropEl!, {
			opacity: 0,
			duration: 0.35,
			ease: 'power1.in',
		});

		if (triggerImg) {
			// Get the transform vars that would position the image at the trigger
			const fitVars = Flip.fit(this.imgEl!, triggerImg, {
				scale: true,
				getVars: true,
			});

			gsap.to(this.imgEl!, {
				...(fitVars as gsap.TweenVars),
				duration: 0.4,
				ease: 'power2.inOut',
				onComplete: onDone,
			});
		} else {
			gsap.to(this.imgEl!, {
				opacity: 0,
				scale: 0.9,
				duration: 0.3,
				ease: 'power2.in',
				onComplete: onDone,
			});
		}
	}

	// =========================================================================
	// Navigation
	// =========================================================================

	next(): void {
		if (!this.isOpen || this.isAnimating || this.items.length <= 1) return;
		this.goTo((this.currentIndex + 1) % this.items.length);
	}

	prev(): void {
		if (!this.isOpen || this.isAnimating || this.items.length <= 1) return;
		this.goTo((this.currentIndex - 1 + this.items.length) % this.items.length);
	}

	private goTo(index: number): void {
		if (index === this.currentIndex) return;

		this.isAnimating = true;
		this.currentIndex = index;
		const item = this.items[index];

		// Crossfade
		gsap.to(this.imgEl!, {
			opacity: 0,
			duration: 0.15,
			ease: 'power1.in',
			onComplete: () => {
				this.imgEl!.src = item.src;
				this.imgEl!.alt = item.caption || '';
				this.updateUI();

				const reveal = () => {
					gsap.to(this.imgEl!, {
						opacity: 1,
						duration: 0.2,
						ease: 'power1.out',
						onComplete: () => {
							this.isAnimating = false;
						},
					});
				};

				if (this.imgEl!.complete && this.imgEl!.naturalWidth > 0) {
					reveal();
				} else {
					this.imgEl!.addEventListener('load', reveal, {
						once: true,
					});
				}
			},
		});
	}

	// =========================================================================
	// Helpers
	// =========================================================================

	private updateUI(): void {
		const item = this.items[this.currentIndex];

		if (this.captionEl) {
			this.captionEl.textContent = item.caption || '';
			this.captionEl.style.display = item.caption ? '' : 'none';
		}
		if (this.counterEl) {
			this.counterEl.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
		}
		if (this.prevBtn) {
			this.prevBtn.disabled = this.items.length <= 1;
		}
		if (this.nextBtn) {
			this.nextBtn.disabled = this.items.length <= 1;
		}
	}

	private onKeydown(e: KeyboardEvent): void {
		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				this.close();
				break;
			case 'ArrowRight':
				e.preventDefault();
				this.next();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				this.prev();
				break;
		}
	}
}
