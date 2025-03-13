import LocomotiveScroll from 'locomotive-scroll'
import { ScrollTrigger } from '../utils/gsap'

const locoScroll = new LocomotiveScroll({
	lenisOptions: {
		wrapper: document.documentElement,
		content: document.body,
		easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) //https://easings.net/#easeOutExpo
	},
	initCustomTicker: (render) => {
		gsap.ticker.add(render);
	},
	destroyCustomTicker: (render) => {
      gsap.ticker.remove(render);
   }
});

// Sincronizza LocomotiveScroll con ScrollTrigger
locoScroll.lenisInstance.on('scroll', ScrollTrigger.update);

// Disabilita il lag smoothing in GSAP per prevenire ritardi nelle animazioni di scroll
gsap.ticker.lagSmoothing(0);

/* // Configura ScrollTrigger per funzionare con LocomotiveScroll
ScrollTrigger.scrollerProxy(document.documentElement, {
	scrollTop(value) {
		return arguments.length && value !== undefined
			? locoScroll.lenisInstance.scrollTo(value, { duration: 0, disableLerp: true })
			: locoScroll.lenisInstance.scroll.instance.scroll.y;
	},
	// we don't have to define a scrollLeft because we're only scrolling vertically.
	getBoundingClientRect() {
		return {
			top: 0,
			left: 0,
			width: window.innerWidth,
			height: window.innerHeight
		};
	},
	pinType: document.documentElement.style.transform ? 'transform' : 'fixed'
});

// Aggiorna ScrollTrigger quando il browser cambia dimensione
ScrollTrigger.addEventListener('refresh', () => locoScroll.lenisInstance.resize());

// Aggiorna tutti i trigger attivi una volta che lo scroll è completo
ScrollTrigger.refresh(); */

export default locoScroll;