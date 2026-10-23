import { encore, gsap } from '@lib/animations';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

// ScrambleText charsets
export const CHARSET_EXT =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?~';
export const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CHARS = '◊▯∆|';

const getTargets = (el: HTMLElement) => {
	// Seleziona tutti i figli che contengono testo
	const targets = Array.from(el.children).filter(
		(child): child is HTMLElement =>
			child instanceof HTMLElement &&
			typeof child.textContent === 'string' &&
			child.textContent.trim() !== ''
	);
	// Se non ci sono figli ma c'è testo nell'elemento stesso
	if (targets.length === 0 && el.textContent && el.textContent.trim() !== '') {
		targets.push(el);
	}
	return targets;
};

const scrambleText = (t: HTMLElement) => ({
	text: t.innerText,
	speed: 2,
	chars: t.dataset.chars ? t.dataset.chars : CHARS,
	revealDelay: 0.1,
});

const scrambleTrigger = (t: HTMLElement) => ({
	trigger: t,
	start: 'top 90%',
	toggleActions: 'play none none reverse',
});

export function scramble() {
	const elements = document.querySelectorAll<HTMLElement>('.c-hyperText');

	// Registra listeners sotto un setup, con teardown automatico
	encore.setup('scramble-events', (ctx, contextSafe) => {
		elements.forEach((el) => {
			const duration = parseFloat(el.dataset.duration || '') || 0.8;
			const hover = el.dataset.scramble?.includes('hover');
			const scroll = el.dataset.scramble?.includes('scroll');

			// Tweens on hover/focus, after the setup ran: contextSafe keeps them in the context
			const handleEvent = contextSafe((event: Event) => {
				const targetEl = event.target as HTMLElement;

				// Seleziona tutti i figli che contengono testo
				const targets = getTargets(targetEl);

				if (
					targets.length > 0 &&
					!targets.some((t) => gsap.isTweening(t)) &&
					matchMedia('(prefers-reduced-motion: no-preference)').matches
				) {
					targets.forEach((t) => {
						gsap.to(t, {
							duration,
							ease: 'sine.in',
							scrambleText: scrambleText(t),
							...(scroll && {
								scrollTrigger: scrambleTrigger(t),
							}),
						});
					});
				}
			});

			ctx.add(() => {
				if (hover) {
					el.addEventListener('pointerenter', handleEvent);
					el.addEventListener('focus', handleEvent);
				}

				return () => {
					if (hover) {
						el.removeEventListener('pointerenter', handleEvent);
						el.removeEventListener('focus', handleEvent);
					}
					// Chiudi eventuali tween pendenti su questo elemento (e discendenti)
					/* gsap.killTweensOf(el)
					const descendants = el.querySelectorAll('*')
					gsap.killTweensOf(descendants) */
				};
			});
		});
	});
}
