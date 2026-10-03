---
paths:
  - "**/*.ts"
  - "**/*.astro"
---

# Page Lifecycle & Swup Script Execution

## SwupScriptsPlugin

Astro hoists and bundles `<script>` tags — they execute once on the initial browser load, then never again on Swup navigations (the browser doesn't re-execute `<script>` tags inserted via innerHTML). **SwupScriptsPlugin is required** to find script tags in swapped HTML and force the browser to re-execute them.

Without SwupScriptsPlugin, the only scripts that work on Swup navigations are those whose `page:load` listener was already registered from a previous visit. Scripts from pages never directly visited (reached only via Swup navigation) will never execute at all — no self-invocation, no listener registration.

This applies to both page-specific scripts (e.g. a page `<script>`) and component-specific scripts (e.g. the `<script>` of `ui/tabs/Tabs.astro`). There is no clean alternative that doesn't sacrifice code splitting or require a fundamentally different architecture (route-based lazy loading, eager imports, custom elements).

## Script placement

- The main content wrapper must use `id="swup"` with `class="transition-fade"` for Swup to manage content replacement.
- The footer sits in a second container, `#swup-footer` (`display: contents`), so pages with `footer={false}` or a `footer` slot swap it too. The wrapper must exist on every page, even without a footer: a missing container makes Swup abort the visit ("Container mismatch") and fall back to a full reload.
- **Page-level `<script>` tags must be placed inside the `<Layout>` slot** (i.e. between `<Layout>` and `</Layout>`), not after `</Layout>`. Astro bundles page-level scripts after the template output — if the script is outside the Layout, it ends up after `</html>` in the built HTML. On full reload the browser error-corrects it into `<body>`, but on Swup navigation the script is outside `#swup` and never gets swapped into the live DOM, so it never executes. Placing the script inside the Layout slot ensures it renders inside `#swup` where SwupScriptsPlugin can find and re-execute it.

## Custom page lifecycle events

`Transitions.ts` dispatches three custom `document` events that decouple page scripts from Swup internals:

| Event                    | Fires at                 | Purpose                                                                    |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| `page:before-preparation`| `visit:start`            | Navigation begins — teardown listeners, prepare for swap                   |
| `page:before-swap`       | before `content:replace` | Old DOM about to be replaced — destroy Scroll, kill GSAP contexts, cleanup |
| `page:load`              | after `content:replace`  | New DOM is in place — re-initialize scripts, animations, scroll            |

Scripts should listen to `page:load` for re-initialization and `page:before-swap` for cleanup. Never listen to Swup hooks directly from page/component scripts — use these custom events to stay decoupled.

## Script initialization patterns

### `init()` helper (preferred)

Use the `init(key, func)` helper exported from `@lib/classes/Transitions` to handle both initial execution and Swup re-initialization in a single call.

```ts
import { init } from '@lib/classes/Transitions';

init('my-feature', () => {
  // setup logic — runs on first load and after every Swup navigation
});
```

**How it works:**
- On first call: executes `func` immediately (or on `DOMContentLoaded` if DOM is still loading), then registers a `page:load` listener for subsequent Swup navigations.
- Uses an `AbortController` keyed by `key`: if the same `key` is registered again (e.g. SwupScriptsPlugin re-executes the script), the previous `page:load` listener is aborted before adding a new one, preventing listener accumulation.

**Caveats:**
- **`key` is required** — it must be a unique string identifier. Without it there is no way to deduplicate listeners across script re-executions.
- **Not compatible with `AM.setup()` persistent animations** — `AM.setup()` is idempotent: it skips execution if the key already exists. On Swup navigation, `init` re-invokes the callback, but `AM.setup` sees the key is still registered and does nothing. Meanwhile, if a global `mm.revert()` destroyed the matchMedia contexts inside the persistent setup, they are never recreated. **Do not use `init()` to wrap persistent `AM.setup()` calls.** For elements that persist in the DOM across navigations (e.g. the header, outside Swup containers), execute the script directly without `init()` and use a local `gsap.matchMedia()` instead of the global `mm`.
- **Only for scripts inside Swup containers** — scripts for elements outside Swup containers (e.g. the header, not in `containers`) are not re-executed by SwupScriptsPlugin, so `init()` adds no value. Execute them directly at module level.
- **Make `func` idempotent** — it can run more than once on the same page (first load, `page:load`, a re-executed script). Guard each element with a `WeakMap<HTMLElement, Handler>` or a `data-initialized` flag so it never gets a second instance.

### `init()` with cleanup (preferred when instances need teardown)

When an instance holds what the swap doesn't remove (frame loops, observers, listeners on `window`/`document`), register its teardown when it's created, once per instance:

```ts
init('my-feature', () => {
  document.querySelectorAll<HTMLElement>('[data-my-feature]').forEach((el) => {
    if (el.dataset.initialized === 'true') return;
    el.dataset.initialized = 'true';
    const instance = create(el);
    // `once`: the listener goes away with the page it cleans up
    document.addEventListener('page:before-swap', () => instance.destroy(), { once: true });
  });
});
```

Example: `ui/sidebar/SidebarProvider.astro` (a single `page:before-swap` listener that destroys the tracked instances).

### Manual pattern (legacy)

The raw pattern is still valid when `init()` doesn't fit (e.g. cleanup-only listeners, persistent setups):

```ts
setup();                                          // self-invoke for initial load
document.addEventListener('page:load', setup);    // re-init on Swup navigation
```

**Cleanup pattern** — if a script needs teardown before content swap:
```ts
setup();
document.addEventListener('page:load', setup);
document.addEventListener('page:before-swap', cleanup);
```

> ⚠️ The manual pattern does not deduplicate listeners. If SwupScriptsPlugin re-executes the script, a new `page:load` listener is added on every navigation. Use `init()` instead when deduplication matters.

### Starwind components

Starwind components in `src/components/ui/` use `init('<Component>', setup)` with the `WeakMap` guard, and never the `astro:*` / `starwind:init` listeners they ship with: see `.claude/rules/starwind.md`.

## Decision guide

| Scenario                                      | Pattern                                     |
| --------------------------------------------- | ------------------------------------------- |
| Script inside Swup container, no persistence  | `init('key', func)`                         |
| Script inside Swup container, needs cleanup   | `init()` + per-instance `page:before-swap` `{ once: true }` |
| Script outside Swup container (e.g. header)   | Direct execution at module level             |
| Persistent `AM.setup()` outside Swup container| Direct execution + local `gsap.matchMedia()` |
| Starwind interactive component                | `init('key', setup)` + `WeakMap` guard (`starwind.md`) |
