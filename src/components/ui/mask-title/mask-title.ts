import { getHeaderHeight, isInViewport } from '@/lib/utils/ui';
import { AM, gsap, mm, init } from '@lib/animations';

init('Mask title', initMaskTitle);

export default function initMaskTitle() {
	mm.add('(prefers-reduced-motion: no-preference)', () => {
		// Seleziona tutti i componenti MaskTitle individualmente
		document.querySelectorAll('.c-maskTitle').forEach((titleElement) => {
			// Per ciascun componente, seleziona tutte le parole
			titleElement.querySelectorAll('.word').forEach((word) => {
				const wordHeight = word.getBoundingClientRect().height;
				const wordTopDistance = word.getBoundingClientRect().top;
				// const headerHeight = getHeaderHeight(false, true)

				const titleText = Array.from(titleElement.querySelectorAll('.word-hidden'))
					.map((w) => w.textContent?.trim())
					.filter(Boolean)
					.join(' ');

				AM.animate(
					`(MaskTitle) ${titleText}`,
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
							/* markers: AM.isDebug && {
								startColor: 'white',
								endColor: 'white',
								indent: 200,
							}, */
						},
					})
				);
			});
		});
	});
}
