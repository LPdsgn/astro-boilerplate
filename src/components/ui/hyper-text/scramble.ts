import { AM, gsap } from '@lib/animations';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

// ScrambleText charsets
export const CHARSET_EXT =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?~';
export const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface ScrambleOptions {
	hover?: boolean;
	scroll?: boolean;
	chars?: string | 'limit' | 'default';
	duration?: number;
	stagger?: number;
	speed?: number;
	revealDelay?: number;
	ease?: string;
	start?: string;
}

export function scramble() {
	const elements = document.querySelectorAll<HTMLElement>('.c-hyperText');

	// Registra listeners sotto un setup, con teardown automatico
	AM.setup('scramble-events', (ctx) => {
		elements.forEach((el) => {
			const handleEvent = (event: Event) => {
				const targetEl = event.target as HTMLElement;
				const duration = parseFloat(targetEl.dataset.duration || '') || 0.8;
				const limited = targetEl.dataset.chars === 'limit';

				// Seleziona tutti i figli che contengono testo
				const targets = Array.from(targetEl.children).filter(
					(child): child is HTMLElement =>
						child instanceof HTMLElement &&
						typeof child.textContent === 'string' &&
						child.textContent.trim() !== ''
				);

				// Se non ci sono figli ma c'è testo nell'elemento stesso
				if (
					targets.length === 0 &&
					targetEl.textContent &&
					targetEl.textContent.trim() !== ''
				) {
					targets.push(targetEl);
				}

				if (
					targets.length > 0 &&
					!targets.some((t) => gsap.isTweening(t)) &&
					gsap.matchMedia('(prefers-reduced-motion: no-preference)')
				) {
					// Applica l'animazione a ciascun target usando AnimationManager
					targets.forEach((t, index) => {
						AM.animate(
							`scramble-${t.textContent?.trim() || index}`,
							gsap.to(t, {
								duration,
								ease: 'sine.in',
								scrambleText: {
									text: t.innerText,
									speed: 2,
									chars: limited
										? CHARSET
										: targetEl.dataset.chars &&
											  targetEl.dataset.chars !== 'default' &&
											  targetEl.dataset.chars !== 'limit'
											? targetEl.dataset.chars // Valore personalizzato
											: CHARSET_EXT,
									revealDelay: 0.1,
								},
							})
						);
					});
				}
			};

			ctx?.add(() => {
				el.addEventListener('pointerenter', handleEvent);
				el.addEventListener('focus', handleEvent);
				return () => {
					el.removeEventListener('pointerenter', handleEvent);
					el.removeEventListener('focus', handleEvent);
					// Chiudi eventuali tween pendenti su questo elemento (e discendenti)
					/* gsap.killTweensOf(el)
               const descendants = el.querySelectorAll('*')
               gsap.killTweensOf(descendants) */
				};
			});
		});
	});
}

/**
 * Applica un'animazione di "scramble" (testo mescolato) agli elementi di testo figli di un elemento HTML.
 * L'animazione può essere attivata tramite scroll, hover o focus, e supporta opzioni personalizzabili.
 *
 * @param el L'elemento HTML su cui applicare l'animazione.
 * @param options Opzioni per personalizzare la durata, i caratteri, la velocità e altri parametri dell'animazione.
 */
/* export function scramble(
   el: HTMLElement,
   options: ScrambleOptions = {},
): void {
	const {
      hover = el.dataset.scrambleHover !== 'false',
      scroll = el.dataset.scrambleScroll !== 'false',
      chars = el.dataset.chars === 'limit',
      duration = parseFloat(el.dataset.duration || '') || 1.3,
      stagger = 0.015,
      speed = 0.9,
      revealDelay = 0,
      ease = 'sine.in',
   } = options

   // Seleziona tutti i figli che contengono testo
   const targets = Array.from(el.children).filter(
      (child): child is HTMLElement =>
         child instanceof HTMLElement &&
         typeof child.textContent === 'string' &&
         child.textContent.trim() !== '',
   )

   // Se non ci sono figli ma c'è testo nell'elemento stesso
   if (targets.length === 0 && el.textContent && el.textContent.trim() !== '') {
      targets.push(el)
   }

   if (targets.length === 0) return

   // Funzione per eseguire l'animazione
   const animateScramble = () => {
		if (
         // Verifica se qualche target è già in animazione
         !targets.some((target) => gsap.isTweening(target)) &&
         gsap.matchMedia('(prefers-reduced-motion: no-preference)') // Verifica reduced motion
      ) {
			targets.forEach((target, index) => {
            let split = new SplitText(target, {
               type: 'words, chars',
               wordsClass: 'word',
               charsClass: 'char',
            })
            AM.animate(`scramble-${target.textContent?.trim() || index}`,
               gsap.to(target, {
                  // Anima i caratteri splittati
                  duration,
                  ease,
                  stagger,
                  scrambleText: {
                     text: '{original}',
                     speed,
                     chars: chars
                        ? CHARSET
                        : el.dataset.chars &&
                            el.dataset.chars !== 'default' &&
                            el.dataset.chars !== 'limit'
                          ? el.dataset.chars
                          : CHARSET_EXT,
                     revealDelay,
                  },
                  //onComplete: () => split.revert(),
               }),
            )
         })
		}
   }

   // Setup ScrollTrigger per attivazione automatica (solo una volta)
   if (!el.dataset.scrambleInitialized) {
      AM.scroll(`scramble-scroll-${el.id || Date.now()}`, {
         trigger: el,
         start: options.start || 'top bottom',
         once: true,
         onEnter: animateScramble,
      })

      // Setup event listeners per hover/focus
      el.addEventListener('pointerenter', animateScramble)
      el.addEventListener('focus', animateScramble)

      // Marca come inizializzato per evitare duplicati
      el.dataset.scrambleInitialized = 'true'
   }
} */
