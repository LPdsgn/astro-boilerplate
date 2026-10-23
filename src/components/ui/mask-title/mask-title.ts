import { getHeaderHeight, isInViewport } from '@/lib/utils/ui';
import { encore, gsap, mm, init } from '@lib/animations';

init('Mask title', initMaskTitle);

export default function initMaskTitle() {
	// init() re-runs on every page:load, also on pages without the component
	const titles = document.querySelectorAll('.c-maskTitle');
	if (!titles.length) return;

	// One setup for the whole feature: every tween and trigger below is reverted on swap
	encore.setup('Mask title', () => {
		mm.add('(prefers-reduced-motion: no-preference)', () => {
			titles.forEach((titleElement) => {
				// Per ciascun componente, seleziona tutte le parole
				titleElement.querySelectorAll('.word').forEach((word) => {
					const wordHeight = word.getBoundingClientRect().height;
					const wordTopDistance = word.getBoundingClientRect().top;
					// const headerHeight = getHeaderHeight(false, true)

					gsap.to(word.children, {
						yPercent: '+=100', // Increase the y position by 100%
						ease: 'expo.inOut',
						scrollTrigger: {
							trigger: word,
							start: isInViewport(word)
								? `top +=${wordTopDistance + wordHeight}`
								: 'top 62.5%',
							end: isInViewport(word) ? 0 : `top`, // add ${headerHeight} if you have a visible header
							scrub: 0.4,
						},
					});
				});
			});
		});
	});
}
