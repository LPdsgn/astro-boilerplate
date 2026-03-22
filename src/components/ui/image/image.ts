import { AM, init } from '@lib/animations';

init('Pixelated image reveal', pixelatedImageReveal);

export default function pixelatedImageReveal() {
	const animationStepDuration = 0.4;
	const gridSize = 7;
	const pixelSize = 100 / gridSize;
	const cards = document.querySelectorAll('.c-image.-pixelated');

	cards.forEach((card, i) => {
		const pixelGrid = card.querySelector('.c-image_pixels');

		// Crea tutti i pixel in un fragment per performance migliori
		const fragment = document.createDocumentFragment();
		for (let row = 0; row < gridSize; row++) {
			for (let col = 0; col < gridSize; col++) {
				const pixel = document.createElement('div');
				pixel.classList.add('c-image_pixel');
				pixel.style.width = `${pixelSize}%`;
				pixel.style.height = `${pixelSize}%`;
				pixel.style.left = `${col * pixelSize}%`;
				pixel.style.top = `${row * pixelSize}%`;
				fragment.appendChild(pixel);
			}
		}
		pixelGrid?.appendChild(fragment);

		const pixels = pixelGrid?.querySelectorAll('.c-image_pixel');
		const totalPixels = pixels?.length || 1;
		const staggerDuration = animationStepDuration / totalPixels;

		// Crea la timeline dell'animazione
		AM.timeline(`pixelate-${i}`, {
			paused: true,
			scrollTrigger: {
				trigger: card,
				start: 'top bottom',
				toggleActions: 'play none none reverse',
				once: false,
			},
		})
			.to(pixels ?? [], {
				display: 'block',
				duration: 0,
				stagger: { each: staggerDuration, from: 'random' },
			})
			.to(card, {
				onStart: () => card?.classList.add('is-active'),
			})
			.to(pixels ?? [], {
				clearProps: 'display',
				duration: 0,
				stagger: { each: staggerDuration, from: 'random' },
			});
	});
}
