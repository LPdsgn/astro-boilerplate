/**
 * Linear interpolation between two numbers
 * @param a - Starting value
 * @param b - End value
 * @param n - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;

/**
 * Interfaccia che rappresenta la posizione del mouse
 */
export interface MousePosition {
	x: number;
	y: number;
}

/**
 * Calcola la posizione del mouse durante un evento
 * @param e - L'evento MouseEvent
 * @returns Un oggetto con le coordinate x e y
 */
export function getMousePos(e: MouseEvent): MousePosition {
	let posx = 0;
	let posy = 0;

	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	} else if (e.clientX || e.clientY) {
		posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}

	return { x: posx, y: posy };
}

/**
 * Crea un listener per tracciare la posizione del mouse
 * @returns Un oggetto con metodi per gestire il tracking
 */
export function createMouseTracker() {
	let currentPosition: MousePosition = { x: 0, y: 0 };

	function handleMouseMove(e: MouseEvent) {
		currentPosition = getMousePos(e);
	}

	function start() {
		window.addEventListener('mousemove', handleMouseMove);
	}

	function stop() {
		window.removeEventListener('mousemove', handleMouseMove);
	}

	function getCurrentPosition(): MousePosition {
		return { ...currentPosition };
	}

	return {
		start,
		stop,
		getCurrentPosition,
	};
}

/**
 * Calcola la distanza tra due punti
 * @param pos1 - Prima posizione
 * @param pos2 - Seconda posizione
 * @returns Distanza tra i due punti
 */
export function calculateDistance(pos1: MousePosition, pos2: MousePosition): number {
	const dx = pos1.x - pos2.x;
	const dy = pos1.y - pos2.y;
	return Math.sqrt(dx * dx + dy * dy);
}

// verifica se l’elemento è già nel viewport
export function isInViewport(el: Element): boolean {
	const rect = el.getBoundingClientRect();
	return rect.top < window.innerHeight && rect.bottom >= 0;
}

/**
 * Calcola l'altezza dell'header con ID "masthead".
 * Restituisce 0 se l'elemento non viene trovato.
 *
 * @param updateCssVar - Se true, imposta anche la variabile CSS --header-height
 * @param watchResize - Se true, aggiorna automaticamente l'altezza al resize della finestra
 * @returns L'altezza dell'header in pixel
 *
 * @example
 * // Importa e usa la funzione (calcolo singolo)
 * import { getHeaderHeight } from '@/lib/utils/getHeaderHeight';
 * const headerHeight = getHeaderHeight();
 *
 * // Per aggiornare la variabile CSS e tenere traccia dei resize
 * getHeaderHeight(true, true);
 */
export function getHeaderHeight(updateCssVar = false, watchResize = false): number {
	// Funzione per calcolare l'altezza
	const calculateHeight = (): number => {
		const header = document.getElementById('masthead');
		const height = header ? header.getBoundingClientRect().height : 0;

		if (updateCssVar) {
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		}

		return height;
	};

	// Calcola l'altezza immediatamente
	const height = calculateHeight();

	// Se richiesto, monitora il resize della finestra
	if (watchResize) {
		// Usa una variabile per debounce
		let resizeTimeout: number | null = null;

		// Rimuovi eventuali listener precedenti per evitare duplicati
		window.removeEventListener('resize', handleResize);

		// Funzione di gestione del resize con debounce
		function handleResize() {
			if (resizeTimeout) {
				window.clearTimeout(resizeTimeout);
			}
			resizeTimeout = window.setTimeout(() => {
				calculateHeight();
			}, 100);
		}

		// Aggiungi il listener
		window.addEventListener('resize', handleResize);
	}

	return height;
}

// © Andy Bell - https://buildexcellentwebsit.es/
// https://utopia.fyi/

import { CONFIG } from '../../site.config';

/**
 * Utopia Clamp Function.
 *
 * This function calculates a CSS `clamp` value based on provided minimum and maximum pixel sizes.
 *
 * @param {number} min - Minimum pixel size.
 * @param {number} max - Maximum pixel size.
 * @returns {string} - The CSS `clamp` value in rems.
 *
 * @throws {Error} - Throws an error if min and max are not equal and rootSize is not defined in the CONFIG.
 *
 * @example
 * const result = utopiaClamp(320, 1440);
 * // Returns 'clamp(20rem, 4.33rem + 6.94vw, 80rem)'
 */
export const utopiaClamp = (min: number, max: number): string => {
	if (min === max) {
		return `${min / CONFIG.utopia.rootSize}rem`;
	}

	if (!CONFIG.utopia.rootSize) {
		throw new Error('Root size is not defined in the CONFIG.');
	}

	// Calculate minSize and maxSize in rems
	const minSize: number = min / CONFIG.utopia.rootSize;
	const maxSize: number = max / CONFIG.utopia.rootSize;

	// Convert the pixel viewport sizes into rems
	const minViewport: number = CONFIG.utopia.minViewport / CONFIG.utopia.rootSize;
	const maxViewport: number = CONFIG.utopia.maxViewport / CONFIG.utopia.rootSize;

	// Slope and intersection allow us to have a fluid value but also keep that sensible
	const slope: number = (maxSize - minSize) / (maxViewport - minViewport);
	const intersection: number = -1 * minViewport * slope + minSize;

	return `clamp(${minSize}rem, ${intersection.toFixed(2)}rem + ${(slope * 100).toFixed(2)}vw, ${maxSize}rem)`;
};
