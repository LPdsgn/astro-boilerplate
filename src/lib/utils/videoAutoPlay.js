/**
 * Handles video loading and autoplay functionality after Astro page load
 * @requires
 * to be loaded inside an 'astro:page-load' listener
 * @description
 * - Selects all video elements in the document
 * - Forces reload of each video
 * - Attempts to play videos with autoplay attribute
 * - Fires on 
 */
export function handleVideo() {
	const videos = document.querySelectorAll('video')

	videos.forEach((video) => {
		// Forza ricaricamento
		video.load()
		// Riavvia riproduzione
		if (video.autoplay) {
			video.play().catch((error) => {
				console.log('Autoplay fallito per video:', video.id, error)
			})
		}
	})
}
