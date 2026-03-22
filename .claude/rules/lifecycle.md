---
paths:
  - "**/*.ts"
  - "**/*.astro"
---

# Page Lifecycle & Swup Script Execution

## SwupScriptsPlugin

Astro hoists and bundles `<script>` tags — they execute once on the initial browser load, then never again on Swup navigations (the browser doesn't re-execute `<script>` tags inserted via innerHTML). **SwupScriptsPlugin is required** to find script tags in swapped HTML and force the browser to re-execute them.

Without SwupScriptsPlugin, the only scripts that work on Swup navigations are those whose `page:load` listener was already registered from a previous visit. Scripts from pages never directly visited (reached only via Swup navigation) will never execute at all — no self-invocation, no listener registration.

This applies to both page-specific scripts (e.g. `_profile.ts`) and component-specific scripts (e.g. `sidebar/index.ts`). There is no clean alternative that doesn't sacrifice code splitting or require a fundamentally different architecture (route-based lazy loading, eager imports, custom elements).

## Script placement

- The main content wrapper must use `id="swup"` with `class="transition-fade"` for Swup to manage content replacement.
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
- **Not compatible with `AM.setup()` persistent animations** — `AM.setup()` is idempotent: it skips execution if the key already exists. On Swup navigation, `init` re-invokes the callback, but `AM.setup` sees the key is still registered and does nothing. Meanwhile, if a global `mm.revert()` destroyed the matchMedia contexts inside the persistent setup, they are never recreated. **Do not use `init()` to wrap persistent `AM.setup()` calls.** For elements that persist in the DOM across navigations (e.g. footer outside Swup containers), execute the script directly without `init()` and use a local `gsap.matchMedia()` instead of the global `mm`.
- **Only for scripts inside Swup containers** — scripts for elements outside Swup containers (e.g. a footer not in `containers`) are not re-executed by SwupScriptsPlugin, so `init()` adds no value. Execute them directly at module level.

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

### Interactive Starwind components

- **Event triple**: Starwind components also listen for `starwind:init` (for dynamically injected components):
  ```ts
  setup();
  document.addEventListener('page:load', setup);
  document.addEventListener('starwind:init', setup);
  ```
- **WeakMap + Handler pattern**: Interactive Starwind components use a `WeakMap<HTMLElement, Handler>` to store instances and prevent duplicates/leaks. The `setup()` function queries elements and only creates a Handler if the WeakMap doesn't already have one. See `src/components/ui/tabs/tabs.ts` for a canonical example.

## Decision guide

| Scenario                                      | Pattern                                     |
| --------------------------------------------- | ------------------------------------------- |
| Script inside Swup container, no persistence  | `init('key', func)`                         |
| Script inside Swup container, needs cleanup   | Manual pattern with `page:before-swap`       |
| Script outside Swup container (e.g. footer)   | Direct execution at module level             |
| Persistent `AM.setup()` outside Swup container| Direct execution + local `gsap.matchMedia()` |
| Starwind interactive component                | Manual pattern with `starwind:init` triple   |
