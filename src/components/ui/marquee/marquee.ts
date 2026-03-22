import { AM, gsap, init, mm } from '@lib/animations';

init('Marquees', initMarquee);

export default function initMarquee() {
	const marquees = document.querySelectorAll('.c-marquee');

	marquees.forEach((marquee) => {
		const row1 = marquee.querySelector('.-first');
		const row2 = marquee.querySelector('.-last');

		if (!row1 || !row2) {
			import.meta.env.DEV && console.warn('Marquee HTML markup not found');
			return;
		}

		mm.add('(prefers-reduced-motion: no-preference)', () => {
			/* document.fonts.ready.then(() => {
					const width = marquee.clientWidth / 2;

					gsap.to(row1, {
						// gsap.to() for forward movement
						x: -width / 2, // Half the width of the phrase
						ease: 'none', // Linear movement
						duration: 10,
						repeat: -1, // Infinite repetition
					})
					gsap.from(row2, {
						// gsap.from() for backward movement
						x: -width / 2,
						ease: 'none', // Linear movement
						duration: 10,
						repeat: -1, // Infinite repetition
					})
				}) */

			AM.animate(
				`(Marquee) ${row1?.children[0]?.textContent}`,
				gsap.to([row1, row2], {
					yPercent: '-=100', // Non-linear movement
					ease: 'power1.inOut', // Non-linear movement
					scrollTrigger: {
						trigger: marquee,
						// start: `top ${Math.min(Math.max(window.innerHeight * 0.775, 100), 500)}`,
						// start: `top ${50 + (marquee.clientHeight / 1.75 / window.innerHeight) * 100}%`,
						start: 'top 62.5%',
						// end: `bottom ${50 - (marquee.clientHeight / 1.75 / window.innerHeight) * 100}%`,
						end: 'bottom 32.5%',
						scrub: 0.4, // Progresses with the scroll, takes 0.4s to update
						markers: import.meta.env.DEV && true,
					},
				})
			);
		});
	});
}
