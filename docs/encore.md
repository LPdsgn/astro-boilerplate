# encore (gsap-encore)

GSAP contexts keyed by name, reverted on Swup page swaps. The package `gsap-encore` (repo `LPdsgn/gsap-encore`, npm `gsap-encore`) replaces the old `AnimationManager` class. Full API and SPA gotchas: `node_modules/gsap-encore/README.md`.

Wired in `src/lib/app.ts`: `encore.init({ adapter: swupAdapter(swup) })` after `Transitions.init()`, and in dev `import('gsap-encore/debug')` for the console badge and `window.encore.orphans()`. Consumers import it from the barrel: `import { encore, gsap } from '@lib/animations'`.

## Lifecycle

1. `page:before-swap` (Transitions) → global `mm.revert()` in `app.ts`
2. `before('content:replace')` → `encore.cleanupAll()`: every non-persistent context is reverted (tweens, ScrollTriggers with their pin spacers, inline styles of `from()`), while the old DOM is still live
3. `page:load` → the `init()` callbacks run again and call `encore.setup()` again; the keys were deleted at step 2, so the setups run
4. `on('content:replace')` → `ScrollTrigger.refresh()`

## API used here

| Call | Purpose |
| --- | --- |
| `encore.setup(key, (ctx, contextSafe) => …, { scope?, persist? })` | Run once per key inside a `gsap.context()`; returns `{ context, contextSafe }` |
| `encore.cleanup(key)` | Revert one key (used by instances with their own lifecycle: `HoverImage`) |
| `encore.refresh()` | `ScrollTrigger.refresh(true)` after a layout change |

Removed from the old manager: `animate`, `timeline`, `scroll`, `register*`, `getStatus`, `debug`, `forceCleanupAll`, `refresh(keys)` and the global `ScrollTrigger.getAll()` sweep. Anything GSAP created inside a setup (or a `contextSafe` wrapper) is tracked; nothing created outside is.

## Four idioms

**A. Feature-level setup, loop inside.** One key per feature, never per element: `setup` is idempotent, so `setup('card', …)` in a loop runs only the first.

```ts
init('Mask title', () => {
	encore.setup('Mask title', () => {
		mm.add('(prefers-reduced-motion: no-preference)', () => {
			words.forEach((word) => gsap.to(word.children, { scrollTrigger: { … } }));
		});
	});
});
```

Timelines and ScrollTriggers are plain `gsap.timeline()` / `ScrollTrigger.create()` inside the callback (`image.ts`, `marquee.ts`).

**B. Persistent, outside the Swup containers** (a header menu, a custom cursor): `{ persist: true }` at module level, never inside `init()`. A persistent setup runs once, so closure variables it assigns are set on that first run only. Short-lived hover tweens on page elements stay out of `contextSafe` there: a persistent context keeps every tween it owns until `destroy()`, which would pin old pages' DOM in memory.

**C. Animations created in handlers** (hover, click, scroll callbacks): wrap the handler in `contextSafe`, otherwise its tweens are not in the context and survive the swap.

```ts
const { contextSafe } = encore.setup(key, (ctx) => {
	ctx.add(() => {
		el.addEventListener('pointerenter', onEnter);
		return () => el.removeEventListener('pointerenter', onEnter);
	});
});
const onEnter = contextSafe(() => gsap.to(el, { … }));
```

Reference: `hover-image.ts` (per-instance key, `encore.cleanup(key)` in `destroy()`), `hyper-text/scramble.ts`. A `gsap.quickTo` created inside the setup is callable from any handler without wrapping. Callbacks that need `this` (Draggable) cannot be wrapped: `contextSafe` rebinds `this` to the context.

**D. `gsap.matchMedia()`.** The global `mm` is reverted on `page:before-swap` in `app.ts`; a setup may call `mm.add()` inside its callback (`mask-title.ts`, `marquee.ts`). Elements outside the Swup containers use a local `gsap.matchMedia()` reverted in the setup's teardown.

## Debugging (dev only)

- Console badge on every setup, cleanup and swap
- `window.encore.orphans()` → tweens and ScrollTriggers alive that no setup owns: they will survive the next swap, so after a navigation this should be empty
- `window.encore.entries()` → the tracked keys

## Rules

- Create GSAP animations and ScrollTriggers only inside `encore.setup()` or a `contextSafe` wrapper
- One key per feature, descriptive (`'Mask title'`, `'Marquees'`)
- `persist: true` only for elements outside the Swup containers (header, cursor), at module level
- Don't call `encore.cleanup()` from a teardown registered in the same setup
