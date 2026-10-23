import { encore, gsap, init, mm } from '@lib/animations';

init('Marquees', initMarquee);

export default function initMarquee() {
	const marquees = document.querySelectorAll('.c-marquee');
	// init() re-runs on every page:load, also on pages without the component
	if (!marquees.length) return;

	// One setup for the whole feature: every tween and trigger below is reverted on swap
	encore.setup('Marquees', () => {
		marquees.forEach((marquee) => {
			const row1 = marquee.querySelector('.-first');
			const row2 = marquee.querySelector('.-last');

			if (!row1 || !row2) {
				import.meta.env.DEV && console.warn('Marquee HTML markup not found');
				return;
			}

			mm.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.to([row1, row2], {
					yPercent: '-=100', // Non-linear movement
					ease: 'power1.inOut', // Non-linear movement
					scrollTrigger: {
						trigger: marquee,
						start: 'top 62.5%',
						end: 'bottom 32.5%',
						scrub: 0.4, // Progresses with the scroll, takes 0.4s to update
						markers: import.meta.env.DEV && true,
					},
				});
			});
		});
	});
}
