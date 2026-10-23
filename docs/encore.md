# AnimationManager (AM)

Singleton that manages all GSAP animations, coordinated with Swup page transitions.
Provided by [`@lpdsgn/gsap-spa-manager`](https://www.npmjs.com/package/@lpdsgn/gsap-spa-manager), re-exported from `@lib/animations` (import it from there).
Initialized in `src/lib/app.ts` after Swup via `AM.init({ debug, adapter: swupAdapter(swup) })`.

## API

| Method                                  | Purpose                                                 |
| --------------------------------------- | ------------------------------------------------------- |
| `register(key, animation, opts?)`       | Register an existing GSAP tween/timeline                |
| `animate(key, animationFactory, opts?)` | Create and register a single animation                  |
| `timeline(key, vars?, opts?)`           | Create and register a timeline                          |
| `scroll(key, vars, opts?)`              | Create a ScrollTrigger instance                         |
| `setup(key, fn, opts?)`                 | Create a `gsap.context()` block with automatic teardown |
| `cleanup(key, force?)`                  | Clean up a specific animation by key                    |
| `cleanupAll()`                          | Clean up all non-persistent animations                  |
| `forceCleanupAll()`                     | Destroy everything including persistent                 |
| `refresh(keys?)`                        | Refresh ScrollTriggers globally or by key(s)            |
| `isActive(key)`                         | Check if key has active animations/triggers/contexts    |
| `getStatus()`                           | Return counts, registered keys, persistent keys         |

All methods accept `opts?: { persist: true }` to survive page transitions. `setup()` also accepts `scope` (element or selector) to scope the GSAP selectors of its context.

## Lifecycle (Swup integration)

1. `before('content:replace')` → `cleanupAll()` (kills non-persistent)
2. `on('content:replace')` → `ScrollTrigger.refresh()`

This replaces the old `page:before-swap` / `page:load` pattern. The hooks are registered by the package's `swupAdapter`.

## setup() — Context-based pattern

The `setup()` method wraps `gsap.context()` for multi-effect blocks with event listener teardown:

```typescript
AM.setup(
	'Footer Follow Cursor',
	(ctx) => {
		ctx?.add(() => {
			el.addEventListener('mousemove', onMove);
			return () => el.removeEventListener('mousemove', onMove);
		}, el);
	},
	{ persist: true }
);
```

Use `setup()` when your animation block includes event listeners, observers, or multiple effects that need coordinated teardown.

## Usage patterns (by reference)

- **Simple scroll animation:** `src/components/ui/mask-title/mask-title.ts`
- **Timelines with explicit cleanup:** `src/components/ui/hover-image/hover-image.ts`
- **Setup with multiple listeners:** `src/components/ui/hyper-text/scramble.ts`
- **Marquee animation:** `src/components/ui/marquee/marquee.ts`

## Scroll system

Smooth scrolling uses **LocomotiveScroll 5** (built on Lenis; use its API, not Lenis directly). Managed by `src/lib/classes/Scroll.ts`, which:

- Initializes with a callback that updates the `$scroll` nanostore
- Runs Lenis on `gsap.ticker` and calls `ScrollTrigger.update` on scroll (one RAF loop)
- Refreshes ScrollTriggers (debounced) when the page height changes
- Destroys on `beforeContentReplace`, re-initializes on `contentReplace`

## Debugging

In dev mode (`AM.isDebug = true`):

- `AM.debug()` — full status dump to console
- `AM.getStatus()` — programmatic state check
- `window.AM` is available in browser console

## Rules

- Always register animations through AM — raw `gsap.to()` or `ScrollTrigger.create()` will not be cleaned up on page transitions
- Use unique, descriptive keys (e.g. `'(MaskTitle) Hero Heading'`)
- Use `persist: true` only for site-wide effects outside Swup containers (header, global cursors); the footer is inside `#swup-footer` and gets replaced on every visit
- Prefer `setup()` over `animate()` when you have event listeners to clean up
