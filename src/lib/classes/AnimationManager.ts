/* eslint-disable no-console */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Swup from 'swup';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animation Manager - Singleton per gestire le animazioni GSAP in Astro con Swup
 *
 * Cosa fa oggi:
 * - Gestione centralizzata di Tween/Timeline e ScrollTrigger, indicizzati per chiave
 * - Setup con gsap.context() e scope opzionale (via `setup(key, fn, { scope })`)
 * - Persistenza opzionale per animazioni, ScrollTrigger e setup (sopravvivono ai page swap)
 * - Cleanup automatico su navigazioni Swup (before content:replace) e API esplicite (`cleanup`, `cleanupAll`, `forceCleanupAll`)
 * - Refresh controllato degli ScrollTrigger via `refresh()`; su resize viene usato con debounce
 * - Debug logging in dev
 *
 * Linee guida d'uso:
 * - Chiamare `init(swup)` dopo aver inizializzato Swup per collegare gli hook del ciclo di vita
 * - Usa `setup()` per blocchi che includono più animazioni e side‑effects (event listeners, observers). Il `setup()` crea un context GSAP e garantisce il teardown.
 * - Dentro `setup()`, chiama liberamente `gsap.to/from/timeline` (verranno catturati dal context). Per side‑effects non‑GSAP usa `ctx.add(() => { ...; return () => teardown })`.
 * - Usa `animate()` per singole Timeline/Tween e `timeline()` come factory comoda.
 * - Registra sempre gli ScrollTrigger con `scroll()` o `registerScrollTriggers()` per un cleanup coerente.
 * - Non chiamare `AM.cleanup()` dal teardown registrato nello stesso `setup()`/context: il manager si occupa del revert.
 */
class AnimationManager {
	private static instance: AnimationManager;
	private swup: Swup | null = null;
	// Track delle animazioni attive (array di animazioni)
	private activeAnimations: Map<string, (gsap.core.Timeline | gsap.core.Tween)[]> = new Map();
	// Track degli ScrollTriggers attivi
	private scrollTriggers: Map<string, ScrollTrigger[]> = new Map();
	// Track delle animazioni persistenti
	private persistentAnimations: Set<string> = new Set();
	// Track degli ScrollTriggers persistenti
	private persistentScrollTriggers: Set<string> = new Set();
	// NEW: contesti gsap.context() per setup() multi-animazione
	private contexts: Map<string, gsap.Context> = new Map();

	public isDebug: boolean = import.meta.env.DEV;

	static getInstance(): AnimationManager {
		if (!AnimationManager.instance) {
			AnimationManager.instance = new AnimationManager();
		}
		return AnimationManager.instance;
	}

	/**
	 * Initialize AnimationManager with Swup instance
	 * Must be called after Swup is initialized in app.ts
	 *
	 * @param swup - Swup instance from Transitions class
	 */
	init(swup: Swup): void {
		if (this.swup) {
			this.log('⚠️ AnimationManager already initialized');
			return;
		}

		this.swup = swup;
		this.setupSwupHooks();
		this.log('✅ AnimationManager initialized with Swup');
	}

	/**
	 * Setup Swup hooks per gestire il ciclo di vita delle animazioni
	 * Usa gli hook ufficiali di Swup invece di eventi custom
	 *
	 * @see https://swup.js.org/hooks/
	 */
	private setupSwupHooks(): void {
		if (!this.swup) {
			this.log('⚠️ Cannot setup hooks - Swup instance not available');
			return;
		}

		// Cleanup prima del content replace (equivalente a before-swap di Astro)
		this.swup.hooks.before('content:replace', () => {
			// Quick check: se non abbiamo nulla da pulire, salta il cleanup
			const hasNonPersistentAnimations = Array.from(this.activeAnimations.keys()).some(
				(key) => !this.persistentAnimations.has(key)
			);
			const hasNonPersistentScrollTriggers = Array.from(this.scrollTriggers.keys()).some(
				(key) => !this.persistentScrollTriggers.has(key)
			);
			const hasNonPersistentContexts = Array.from(this.contexts.keys()).some(
				(key) => !this.persistentAnimations.has(key)
			);

			if (
				!hasNonPersistentAnimations &&
				!hasNonPersistentScrollTriggers &&
				!hasNonPersistentContexts
			) {
				if (this.isDebug) {
					this.log('⚡ No cleanup needed - only persistent animations active');
				}
				return;
			}

			if (this.isDebug) {
				this.log('🧹 Cleaning up animations before page swap');
			}
			this.cleanupAll();
		});

		// Refresh dopo il content replace (equivalente a after-swap di Astro)
		this.swup.hooks.on('content:replace', () => {
			this.log('🔄 Page swapped, ready for new animations');
			ScrollTrigger.refresh();
		});
	}

	/**
	 * Registra una nuova animazione GSAP creata esternamente (Tween o Timeline).
	 * Preferisci `animate()`/`timeline()` a meno che tu non abbia già un'istanza creata.
	 */
	register(
		key: string,
		animation: gsap.core.Timeline | gsap.core.Tween | (gsap.core.Timeline | gsap.core.Tween)[],
		options?: { persist?: boolean }
	): void {
		if (!this.activeAnimations.has(key) && !this.contexts.has(key)) {
			// Normalizza a array per coerenza interna
			const animations = Array.isArray(animation) ? animation : [animation];
			this.activeAnimations.set(key, animations);

			// Marca come persistente se richiesto
			if (options?.persist) {
				this.persistentAnimations.add(key);
				this.log(
					`✅ Registered PERSISTENT animation: ${key} (${animations.length} tween/timeline)`
				);
			} else {
				this.log(`✅ Registered new animation: ${key} (${animations.length} tween/timeline)`);
			}
		} else {
			this.log(`♻️ Reusing animation: ${key}`);
			// this.trace(`Duplicate animation registration for: ${key}`)
		}
	}

	/**
	 * Registra ScrollTrigger per una specifica chiave
	 */
	registerScrollTriggers(
		key: string,
		triggers: ScrollTrigger[],
		options?: { persist?: boolean }
	): void {
		if (!this.scrollTriggers.has(key)) {
			this.scrollTriggers.set(key, triggers);

			if (options?.persist) {
				this.persistentScrollTriggers.add(key);
				this.log(`📍 Registered PERSISTENT ScrollTriggers for: ${key}`);
			} else {
				this.log(`📍 Registered ScrollTriggers for: ${key}`);
			}
		}
	}

	/**
	 * Crea e registra una singola animazione GSAP (Tween o Timeline).
	 *
	 * @template T Tipo di animazione (Timeline o Tween)
	 * @param key Chiave univoca
	 * @param animationFactory Factory che ritorna la Timeline/Tween o array di animazioni
	 * @param options.persist Se true, l'animazione è preservata ai cleanup non forzati
	 */
	animate<T extends gsap.core.Timeline | gsap.core.Tween>(
		key: string,
		animationFactory: T | T[],
		options?: { persist?: boolean }
	): T {
		// Passa l'intero array o singola animazione al register
		this.register(key, animationFactory, options);
		// Ritorna sempre il primo elemento per compatibilità
		const animation = Array.isArray(animationFactory) ? animationFactory[0] : animationFactory;
		return animation;
	}

	/**
	 * Esegue e registra un blocco di setup con `gsap.context()` per orchestrare animazioni e side‑effects.
	 * Garantisce che il setup venga eseguito una sola volta per chiave (idempotente) e offre persistenza opzionale.
	 *
	 * Dettagli:
	 * - Crea internamente un `gsap.context()`; se passi `options.scope`, i selettori saranno risolti rispetto a quello scope.
	 * - Tutte le animazioni GSAP chiamate dentro il setup sono tracciate dal context e verranno revertate al cleanup.
	 * - Per side‑effects non GSAP (addEventListener, observers, setInterval), registra teardown con `ctx.add(() => { ...; return () => { ... } })`.
	 * - Se `persist: true`, il setup non viene pulito su `cleanupAll()` (solo su `forceCleanupAll()`).
	 *
	 * @param key Chiave univoca del setup
	 * @param ctx Contesto GSAP (opzionale, ma consigliato - senza il contenuto non sarà aggiunto al context e pulito automaticamente)
	 * @param setupFunction Funzione eseguita nel context (riceve `ctx` se impostato)
	 * @param options.persist Se true, il setup è persistente
	 * @param options.scope Elemento o selettore per scoping dei selettori GSAP
	 *
	 * @example
	 * AM.setup('globalEffects', (ctx) => {
	 *   // Animazioni catturate dal context
	 *   gsap.to('.el', { opacity: 1 })
	 *
	 *   // Side‑effects con teardown
	 *   const onScroll = () => {}
	 *   ctx?.add(() => {
	 *     window.addEventListener('scroll', onScroll)
	 *     return () => window.removeEventListener('scroll', onScroll)
	 *   })
	 * }, { persist: true, scope: document.body })
	 */
	setup(
		key: string,
		setupFunction: (ctx?: gsap.Context) => void,
		options?: { persist?: boolean; scope?: Element | string }
	): void {
		if (!this.activeAnimations.has(key) && !this.contexts.has(key)) {
			const ctx = gsap.context((self: gsap.Context) => {
				setupFunction(self);
			}, options?.scope as any);
			this.contexts.set(key, ctx);

			// Registra un placeholder array per tracciare che questo setup è stato eseguito
			this.activeAnimations.set(key, [{ kill: () => {} } as any]);

			// Gestisci la persistenza
			if (options?.persist) {
				this.persistentAnimations.add(key);
				this.log(`🔧 PERSISTENT setup completed: ${key}`);
			} else {
				this.log(`🔧 Setup completed: ${key}`);
			}
		} else {
			this.log(`♻️ Setup already executed: ${key}`);
		}
	}

	/**
	 * Crea e registra una Timeline con opzioni GSAP standard.
	 *
	 * @param key Chiave univoca della timeline
	 * @param vars Opzioni della timeline GSAP
	 * @param options.persist Se true, la timeline è preservata ai cleanup non forzati
	 * @returns Istanza di Timeline
	 */
	timeline(
		key: string,
		vars?: gsap.TimelineVars,
		options?: { persist?: boolean }
	): gsap.core.Timeline {
		return this.animate(key, gsap.timeline(vars), options);
	}

	/**
	 * Crea e registra un nuovo ScrollTrigger con la chiave indicata.
	 *
	 * @param key Chiave univoca dello ScrollTrigger
	 * @param vars Configurazione di ScrollTrigger
	 * @param options.persist Se true, lo ScrollTrigger è preservato ai cleanup non forzati
	 * @returns L'istanza creata, o null se esiste già per quella chiave
	 */
	scroll(
		key: string,
		vars: ScrollTrigger.Vars,
		options?: { persist?: boolean }
	): ScrollTrigger | null {
		// Se il trigger esiste già, non crearne un altro
		if (this.scrollTriggers.has(key)) {
			this.log(`⚠️ ScrollTrigger already exists for: ${key} - skipping`);
			return null;
		}

		const trigger = ScrollTrigger.create(vars);
		this.registerScrollTriggers(key, [trigger], options);
		return trigger;
	}

	/**
	 * Helper ottimizzato per killare array di animazioni GSAP.
	 * Riduce overhead filtrando null/undefined e usando kill ottimizzato.
	 */
	private killAnimations(animations: (gsap.core.Timeline | gsap.core.Tween)[]): void {
		if (!animations || animations.length === 0) return;

		// Filtra null/undefined una sola volta invece di fare check per ogni elemento
		const validAnimations = animations.filter(Boolean) as (
			| gsap.core.Timeline
			| gsap.core.Tween
		)[];

		if (validAnimations.length === 0) return;

		// Kill ottimizzato per performance
		validAnimations.forEach((animation) => {
			try {
				// Kill senza parametri per evitare problemi di tipo
				animation.kill();
			} catch (e) {
				// Fail silently per animazioni già killed o corrotte
				if (this.isDebug) {
					console.warn('Failed to kill animation:', e);
				}
			}
		});
	}

	/**
	 * Helper ottimizzato per killare array di ScrollTriggers.
	 */
	private killScrollTriggers(triggers: ScrollTrigger[]): void {
		if (!triggers || triggers.length === 0) return;

		// Kill tutti i trigger, generalmente più robusto di GSAP animations
		triggers.forEach((trigger) => trigger.kill());
	}

	/**
	 * Cleanup di una specifica chiave: revert di un eventuale context associato, kill di Timeline/Tween e ScrollTrigger registrati.
	 * Rispetta la persistenza salvo `force=true`.
	 *
	 * @param key Chiave da pulire
	 * @param force Se true, forza la pulizia anche se l'animazione è persistente
	 */
	cleanup(key: string, force: boolean = false): void {
		// Controlla se l'animazione è persistente e non è forzata
		if (!force && this.isPersistent(key)) {
			if (this.isDebug) {
				this.log(`🔒 Skipping cleanup for persistent animation: ${key}`);
			}
			return;
		}

		let cleanedItems = 0;

		// NEW: revert di eventuale context registrato
		const ctx = this.contexts.get(key);
		if (ctx) {
			ctx.revert();
			this.contexts.delete(key);
			cleanedItems++;
		}

		// Vecchia logica per tween/timeline singoli (ora array)
		const animations = this.activeAnimations.get(key);
		if (animations) {
			// Kill tutte le animazioni nell'array con helper ottimizzato
			this.killAnimations(animations);
			// Clear dall'activeAnimations
			this.activeAnimations.delete(key);
			cleanedItems++;
		}

		this.cleanupScrollTriggers(key, force);

		// Se è un cleanup forzato, rimuovi anche la persistenza
		if (force) {
			this.removePersistence(key);
		}

		// Log ottimizzato solo se abbiamo effettivamente pulito qualcosa
		if (this.isDebug && cleanedItems > 0) {
			this.log(`🧹 Cleaned up: ${key}`);
		}
	}

	/**
	 * Cleanup degli ScrollTrigger associati a una chiave (se non persistenti o se `force=true`).
	 *
	 * @param key Chiave da pulire
	 * @param force Se true, forza la pulizia anche se l'animazione è persistente
	 */
	private cleanupScrollTriggers(key: string, force: boolean = false): void {
		// Controlla se i ScrollTrigger sono persistenti
		if (!force && this.persistentScrollTriggers.has(key)) {
			return; // Rimuovi log ridondante
		}

		const triggers = this.scrollTriggers.get(key);
		if (triggers) {
			this.killScrollTriggers(triggers);
			this.scrollTriggers.delete(key);
			// Log ridotto solo in debug
			if (this.isDebug) {
				this.log(`🗑️ Cleaned ScrollTriggers: ${key} (${triggers.length})`);
			}
		}
	}

	/**
	 * Cleanup completo: revert di tutti i context non persistenti, kill di animazioni e ScrollTrigger non persistenti,
	 * sweep finale dei trigger non registrati nel manager.
	 */
	cleanupAll(): void {
		// Trace per vedere chi ha chiamato il cleanup (solo in debug)
		if (this.isDebug) {
			this.trace(`cleanupAll() called from:`);
		}

		const cleanupStats = { contexts: 0, animations: 0, scrollTriggers: 0 };

		// Revert dei context NON persistenti (prima raccogli chiavi, poi rimuovi)
		const ctxKeysToCleanup: string[] = [];
		for (const key of this.contexts.keys()) {
			if (!this.persistentAnimations.has(key)) ctxKeysToCleanup.push(key);
		}
		for (const key of ctxKeysToCleanup) {
			const ctx = this.contexts.get(key);
			ctx?.revert();
			this.contexts.delete(key);
			cleanupStats.contexts++;
		}

		// Kill solo le animazioni NON persistenti
		const animKeysToCleanup: string[] = [];
		for (const key of this.activeAnimations.keys()) {
			if (!this.persistentAnimations.has(key)) animKeysToCleanup.push(key);
		}
		for (const key of animKeysToCleanup) {
			const animations = this.activeAnimations.get(key);
			if (animations) this.killAnimations(animations);
			this.activeAnimations.delete(key);
			cleanupStats.animations++;
		}

		// Kill solo gli ScrollTrigger registrati nel manager che non sono persistenti.
		const stKeysToCleanup: string[] = [];
		for (const key of this.scrollTriggers.keys()) {
			if (!this.persistentScrollTriggers.has(key)) stKeysToCleanup.push(key);
		}
		for (const key of stKeysToCleanup) {
			const triggers = this.scrollTriggers.get(key);
			if (triggers) this.killScrollTriggers(triggers);
			this.scrollTriggers.delete(key);
			cleanupStats.scrollTriggers++;
		}

		/**
		 * Cleanup globale di tutti gli ScrollTrigger, esclusi quelli persistenti.
		 * OTTIMIZZATO: Usa Set per lookup O(1) e batch operations.
		 */
		if (this.persistentScrollTriggers.size > 0) {
			// Set di tutti i trigger persistenti per lookup O(1)
			const persistentSet = new Set<ScrollTrigger>();
			for (const key of this.persistentScrollTriggers) {
				const triggers = this.scrollTriggers.get(key);
				triggers?.forEach((t) => persistentSet.add(t));
			}
			const toKill: ScrollTrigger[] = [];
			for (const t of ScrollTrigger.getAll()) {
				if (!persistentSet.has(t)) toKill.push(t);
			}
			if (toKill.length) this.killScrollTriggers(toKill);
		} else {
			const all = ScrollTrigger.getAll();
			if (all.length) this.killScrollTriggers(all);
		}

		// Log ottimizzato: un solo messaggio con stats aggregate
		if (this.isDebug) {
			this.log(
				`🗑️ Cleanup completed: ${cleanupStats.contexts} contexts, ${cleanupStats.animations} animations, ${cleanupStats.scrollTriggers} ScrollTriggers cleaned`
			);
		}
	}

	/**
	 * Cleanup forzato: rimuove tutto (context, animazioni, ScrollTrigger) ignorando la persistenza.
	 */
	forceCleanupAll(): void {
		// NEW: revert TUTTI i context
		this.contexts.forEach((ctx) => ctx.revert());
		this.contexts.clear();

		this.activeAnimations.forEach((animations) => {
			// Kill tutte le animazioni nell'array con helper ottimizzato
			this.killAnimations(animations);
		});
		this.activeAnimations.clear();

		this.scrollTriggers.forEach((triggers) => {
			this.killScrollTriggers(triggers);
		});
		this.scrollTriggers.clear();

		// Pulisci anche i set di persistenza
		this.persistentAnimations.clear();
		this.persistentScrollTriggers.clear();

		// Kill tutti gli ScrollTrigger rimanenti in batch
		const allTriggers = ScrollTrigger.getAll();
		if (allTriggers.length > 0) {
			this.killScrollTriggers(allTriggers);
		}

		this.log('🗑️ FORCE cleanup - everything destroyed');
	}

	/**
	 * Rimuovi persistenza da un'animazione specifica
	 */
	removePersistence(key: string): void {
		this.persistentAnimations.delete(key);
		this.persistentScrollTriggers.delete(key);
		this.log(`🔓 Removed persistence for: ${key}`);
	}

	/**
	 * Verifica se un'animazione è persistente
	 */
	isPersistent(key: string): boolean {
		return this.persistentAnimations.has(key) || this.persistentScrollTriggers.has(key);
	}

	/**
	 * Aggiorna gli ScrollTrigger per mantenere posizionamenti e comportamenti corretti.
	 *
	 * @param keys Chiave singola o array di chiavi da refreshare; se omesso, viene effettuato un refresh globale via `ScrollTrigger.refresh(true)`.
	 *
	 * Esempi:
	 * - `AM.refresh()` → refresh globale di tutti gli ScrollTrigger
	 * - `AM.refresh('hero')` → refresh dei trigger registrati sotto 'hero'
	 * - `AM.refresh(['hero', 'cards'])` → refresh dei trigger per più chiavi
	 */
	refresh(keys?: string | string[]): void {
		if (!keys) {
			// Aggiorna matchMedia e, alla fine, ScrollTrigger.refresh()
			// gsap.matchMediaRefresh() // for responsive animation
			ScrollTrigger.refresh(true); // for all scrollTriggers (with additional `safe` parameter)

			this.log('🔄 All matchMedia + ScrollTriggers refreshed');
			return;
		}

		const keysToRefresh = Array.isArray(keys) ? keys : [keys];
		let refreshedCount = 0;

		keysToRefresh.forEach((key) => {
			const triggers = this.scrollTriggers.get(key);
			if (triggers) {
				triggers.forEach((trigger) => trigger.refresh());
				refreshedCount++;
				this.log(`🔄 ScrollTriggers refreshed for: ${key}`);
			} else {
				this.log(`⚠️ No ScrollTriggers found for key: ${key}`);
			}
		});

		if (refreshedCount > 0) {
			this.log(`✅ Refreshed ScrollTriggers for ${refreshedCount} key(s)`);
		}
	}

	/**
	 * Ottieni informazioni sullo stato corrente
	 */
	getStatus(): {
		animations: number;
		scrollTriggers: number;
		persistent: number;
		keys: string[];
		persistentKeys: string[];
	} {
		const totalScrollTriggers = Array.from(this.scrollTriggers.values()).reduce(
			(total, triggers) => total + triggers.length,
			0
		);

		const totalPersistent = this.persistentAnimations.size + this.persistentScrollTriggers.size;

		return {
			animations: this.activeAnimations.size,
			scrollTriggers: totalScrollTriggers,
			persistent: totalPersistent,
			keys: [
				...this.activeAnimations.keys(),
				...this.scrollTriggers.keys(),
				...this.contexts.keys(),
			],
			persistentKeys: [
				...this.persistentAnimations.keys(),
				...this.persistentScrollTriggers.keys(),
			],
		};
	}

	/**
	 * Helper per verifica se un'animazione è attiva
	 */
	isActive(key: string): boolean {
		return (
			this.activeAnimations.has(key) || this.scrollTriggers.has(key) || this.contexts.has(key)
		);
	}

	// Icona come background su uno spazio, usata come primo segmento `%c `
	logIcon = '%c ';
	logIconStyle = [
		`background: url("data:image/svg+xml,%3Csvg%20version%3D%221.0%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400.000000pt%22%20height%3D%22400.000000pt%22%20viewBox%3D%220%200%20400.000000%20400.000000%22%20preserveAspectRatio%3D%22xMidYMid%20meet%22%3E%3Cmetadata%3ECreated%20by%20potrace%201.14%2C%20written%20by%20Peter%20Selinger%202001-2017%3C%2Fmetadata%3E%3Cg%20transform%3D%22translate(0.000000%2C400.000000)%20scale(0.100000%2C-0.100000)%22%20fill%3D%22%230ae448%22%20stroke%3D%22none%22%3E%3Cpath%20d%3D%22M853%203945%20c-202%20-36%20-385%20-133%20-533%20-284%20-189%20-194%20-281%20-430%20-274%20-708%205%20-262%2098%20-478%20283%20-664%20150%20-150%20310%20-234%20519%20-272%2063%20-11%2082%20-26%2037%20-28%20-14%20-1%20-28%20-2%20-32%20-3%20-5%20-1%20-26%20-5%20-48%20-10%20-287%20-57%20-567%20-291%20-685%20-573%20-55%20-132%20-73%20-224%20-74%20-378%200%20-283%2092%20-505%20289%20-700%20181%20-179%20399%20-273%20650%20-280%20446%20-12%20823%20248%20964%20667%2027%2081%2047%20178%2042%20206%20-1%206%202%2012%206%2012%205%200%2010%20-12%2011%20-27%207%20-91%2045%20-219%2095%20-318%20103%20-206%20297%20-387%20506%20-471%20213%20-86%20482%20-93%20694%20-18%20146%2053%20258%20124%20373%20239%20126%20126%20218%20293%20260%20473%2019%2078%2025%20259%2013%20352%20-42%20308%20-249%20594%20-534%20737%20-103%2052%20-306%20107%20-350%2094%20-5%20-1%20-6%201%20-2%205%204%204%2014%209%2022%2010%207%201%2032%205%2055%208%20310%2043%20615%20282%20738%20578%2058%20139%2075%20228%2076%20383%200%20154%20-14%20234%20-64%20364%20-87%20226%20-283%20432%20-504%20531%20-143%2064%20-269%2088%20-436%2084%20-298%20-7%20-550%20-134%20-745%20-375%20-92%20-113%20-171%20-295%20-191%20-439%20-3%20-23%20-7%20-48%20-8%20-55%20-1%20-8%20-6%20-18%20-10%20-22%20-4%20-4%20-6%20-3%20-5%202%207%2022%20-13%20129%20-37%20207%20-50%20158%20-124%20280%20-243%20399%20-138%20137%20-285%20218%20-481%20265%20-83%2020%20-284%2025%20-377%209z%20m1199%20-1279%20c93%20-264%20270%20-459%20521%20-576%2084%20-39%20228%20-80%20279%20-80%2043%200%2025%20-16%20-24%20-23%20-197%20-26%20-383%20-121%20-534%20-271%20-157%20-156%20-258%20-357%20-287%20-573%20-5%20-33%20-12%20-36%20-15%20-5%20-20%20257%20-196%20543%20-429%20698%20-115%2076%20-324%20153%20-423%20156%20-17%201%20-33%206%20-37%2011%20-3%206%20-2%207%204%204%2016%20-10%20203%2033%20283%2065%20307%20125%20554%20436%20596%20748%2010%2073%2017%2069%2031%20-15%208%20-44%2023%20-107%2035%20-139z%20m-1102%20-662%20c0%20-8%20-19%20-13%20-24%20-6%20-3%205%201%209%209%209%208%200%2015%20-2%2015%20-3z%22%2F%3E%3C%2Fg%3E%3Cdiv%20xmlns%3D%22%22%20id%3D%22divScriptsUsed%22%20style%3D%22display%3A%20none%22%2F%3E%3Cscript%20xmlns%3D%22%22%20id%3D%22globalVarsDetection%22%20src%3D%22moz-extension%3A%2F%2F4f8d3e3e-f733-4451-acdf-f2a9421a4762%2Fjs%2Fwrs_env.js%22%2F%3E%3C%2Fsvg%3E") no-repeat black center;`,
		'background-repeat: no-repeat',
		'background-position: center',
		'background-size: 12px 12px',
		'padding: 2px 6px',
		'border-radius: 2px 0 0 2px',
	].join(';');
	// Titolo con marker %c per applicare lo stile e poi resettarlo (viene preceduto da logIcon)
	logTitleStyle = [
		'background: #424242',
		'color: white',
		'padding: 2px 4px',
		'border-radius: 0 2px 2px 0',
	].join(';');
	logTitle = `%cAnimationManager`;
	logResetStyle = '';

	/**
	 * Logging con controllo debug e raggruppamento automatico
	 */
	public log(message: string | string[], groupTitle?: string): void {
		if (this.isDebug) {
			if (Array.isArray(message)) {
				// Messaggi multipli
				const title = groupTitle || 'Batch Operation';
				console.groupCollapsed(
					`${this.logIcon}${this.logTitle}%c ${title}`,
					this.logIconStyle,
					this.logTitleStyle,
					this.logResetStyle
				);
				message.forEach((msg) =>
					console.log(
						`${this.logIcon}${this.logTitle}%c ${msg}`,
						this.logIconStyle,
						this.logTitleStyle,
						this.logResetStyle
					)
				);
				console.groupEnd();
			} else {
				// Messaggio singolo
				console.log(
					`${this.logIcon}${this.logTitle}%c ${message}`,
					this.logIconStyle,
					this.logTitleStyle,
					this.logResetStyle
				);
			}
		}
	}

	/**
	 * Helper per tracciare chiamate di metodi critici
	 */
	private trace(message: string): void {
		if (this.isDebug) {
			console.trace(
				`${this.logIcon}${this.logTitle}%c ${message}`,
				this.logIconStyle,
				this.logTitleStyle,
				this.logResetStyle
			);
		}
	}

	/**
	 * Metodo per debugging - mostra stato completo
	 */
	debug(): void {
		if (this.isDebug) {
			const status = this.getStatus();
			console.group(
				`${this.logIcon}${this.logTitle}%c Debug Info`,
				this.logIconStyle,
				this.logTitleStyle,
				this.logResetStyle
			);
			console.log('Active animations:', status.animations);
			console.log('Active ScrollTriggers:', status.scrollTriggers);
			console.log('Registered keys:', status.keys);
			console.log('Animations map:', this.activeAnimations);
			console.log('ScrollTriggers map:', this.scrollTriggers);
			console.groupEnd();
		}
	}
}

// Esporta l'istanza singleton
export const AM = AnimationManager.getInstance();

// In sviluppo, esponi l'istanza per il debugging
if (import.meta.env.DEV) {
	(window as any).AM = AM;
}
