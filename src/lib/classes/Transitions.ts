import { isDebug, isProd } from '@/site.config';
import { Scroll } from '@lib/classes/Scroll';
import { toDash } from '@lib/utils/string';
import SwupA11yPlugin from '@swup/a11y-plugin'; /* https://swup.js.org/plugins/a11y-plugin/ */
import SwupBodyClassPlugin from '@swup/body-class-plugin'; /* https://swup.js.org/plugins/body-class-plugin/ */
import SwupDebugPlugin from '@swup/debug-plugin'; /* https://swup.js.org/plugins/debug-plugin/ */
import SwupHeadPlugin from '@swup/head-plugin';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupProgressPlugin from '@swup/progress-plugin'; /* https://swup.js.org/plugins/progress-plugin/ */
import SwupScriptsPlugin from '@swup/scripts-plugin';
import Swup from 'swup';

export class Transitions {
	static readonly READY_CLASS = 'is-ready';
	static readonly TRANSITION_CLASS = 'is-transitioning';

	private onVisitStartBind: any;
	private beforeContentReplaceBind: any;
	private onContentReplaceBind: any;
	private onAnimationInEndBind: any;
	private onAnimationOutStartBind: any;

	public swup: Swup | undefined; // Public for external access (AnimationManager, etc.)

	constructor() {
		this.onVisitStartBind = this.onVisitStart.bind(this);
		this.beforeContentReplaceBind = this.beforeContentReplace.bind(this);
		this.onContentReplaceBind = this.onContentReplace.bind(this);
		this.onAnimationInEndBind = this.onAnimationInEnd.bind(this);
		this.onAnimationOutStartBind = this.onAnimationOutStart.bind(this);
	}

	// =============================================================================
	// Lifecycle
	// =============================================================================
	init() {
		this.initSwup();

		requestAnimationFrame(() => {
			document.documentElement.classList.add(Transitions.READY_CLASS);
		});
	}

	destroy() {
		this.swup?.destroy();
	}

	// =============================================================================
	// Methods
	// =============================================================================
	initSwup() {
		this.swup = new Swup({
			animateHistoryBrowsing: true,
			containers: ['#swup'],
			plugins: [
				new SwupA11yPlugin(),
				new SwupBodyClassPlugin({
					attributes: [/^data-/],
				}),
				new SwupHeadPlugin({
					persistAssets: true,
					awaitAssets: true,
					attributes: [/^data-/],
				}),
				new SwupPreloadPlugin({
					preloadHoveredLinks: true,
					preloadInitialPage: isProd,
				}),
				new SwupProgressPlugin(),
				new SwupScriptsPlugin(),
				...(isDebug ? [new SwupDebugPlugin({ globalInstance: true })] : []),
			],
		});

		this.swup.hooks.on('visit:start', this.onVisitStartBind);
		this.swup.hooks.before('content:replace', this.beforeContentReplaceBind);
		this.swup.hooks.on('content:replace', this.onContentReplaceBind);
		this.swup.hooks.on('animation:in:end', this.onAnimationInEndBind);
		this.swup.hooks.on('animation:out:start', this.onAnimationOutStartBind);

		this.swup.hooks.on('fetch:error', (e) => {
			console.log('fetch:error:', e);
		});
		this.swup.hooks.on('fetch:timeout', (e) => {
			console.log('fetch:timeout:', e);
		});
	}

	/**
	 * Retrieve HTML dataset on next container and update our real html element dataset accordingly
	 *
	 * @param visit: VisitType
	 */
	updateDocumentAttributes(visit: VisitType) {
		if (visit.fragmentVisit) return;

		const parser = new DOMParser();
		const nextDOM = parser.parseFromString(visit.to.html, 'text/html');
		const newDataset = {
			...nextDOM.querySelector('html')?.dataset,
		};

		Object.entries(newDataset).forEach(([key, val]) => {
			document.documentElement.setAttribute(`data-${toDash(key)}`, val ?? '');
		});
	}

	// =============================================================================
	// Hooks
	// =============================================================================

	/**
	 * On visit:start
	 * Transition to a new page begins
	 *
	 * @see https://swup.js.org/hooks/#visit-start
	 * @param visit: VisitType
	 */
	onVisitStart() {
		document.documentElement.classList.add(Transitions.TRANSITION_CLASS);
		document.documentElement.classList.remove(Transitions.READY_CLASS);

		// Dispatch custom event for scripts re-initialization
		document.dispatchEvent(new Event('page:before-preparation'));
	}

	/**
	 * On before:content:replace
	 * The old content of the page is replaced by the new content.
	 *
	 * @see https://swup.js.org/hooks/#content-replace
	 * @param visit: VisitType
	 */
	beforeContentReplace() {
		Scroll?.destroy();

		// Dispatch custom event for scripts re-initialization
		document.dispatchEvent(new Event('page:before-swap'));
	}

	/**
	 * On content:replace
	 * The old content of the page is replaced by the new content.
	 *
	 * @see https://swup.js.org/hooks/#content-replace
	 * @param visit: VisitType
	 */
	onContentReplace(visit: VisitType) {
		Scroll?.init();
		this.updateDocumentAttributes(visit);

		// Dispatch custom event for scripts re-initialization
		document.dispatchEvent(new Event('page:load'));
	}

	/**
	 * On animation:out:start
	 * Current content starts animating out. Class `.is-animating` is added.
	 *
	 * @see https://swup.js.org/hooks/#animation-out-start
	 * @param visit: VisitType
	 */
	onAnimationOutStart() {}

	/**
	 * On animation:in:end
	 * New content finishes animating out.
	 *
	 * @see https://swup.js.org/hooks/#animation-in-end
	 * @param visit: VisitType
	 */
	onAnimationInEnd() {
		document.documentElement.classList.remove(Transitions.TRANSITION_CLASS);
		document.documentElement.classList.add(Transitions.READY_CLASS);
	}
}

/**
 * Helper di inizializzazione per script di pagine e componenti.
 * Esegue `func` al primo caricamento e la ri-esegue dopo ogni navigazione Swup.
 *
 * Usa un `AbortController` per evitare l'accumulo di listener: ogni chiamata
 * con lo stesso `key` annulla la registrazione precedente prima di aggiungerne una nuova.
 *
 * @param key - Identificativo univoco per deduplicare le registrazioni
 * @param func - Callback di inizializzazione
 *
 * @example
 * ```ts
 * import { init } from '@lib/classes/Transitions';
 * init('my-feature', () => { ... });
 * ```
 */
const initControllers = new Map<string, AbortController>();

export function init(key: string, func: () => void) {
	// Annulla eventuali listener precedenti con lo stesso key
	initControllers.get(key)?.abort();
	const controller = new AbortController();
	initControllers.set(key, controller);

	// Esecuzione immediata se DOM già caricato
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', func, { signal: controller.signal });
	} else {
		func();
	}

	// Ri-inizializzazione dopo page transition
	document.addEventListener('page:load', func, { signal: controller.signal });
}
