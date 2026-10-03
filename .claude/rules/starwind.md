---
paths:
  - "src/components/ui/**"
  - "starwind.config.json"
---

# Starwind Components

Starwind components are copied into `src/components/ui/` and customized for this stack. `starwind.config.json` lists them with their versions: the other folders in `src/components/ui/` (container, marquee, hover-image, mask-title, hyper-text, link, …) are project components that the CLI never touches.

## Version policy: legacy only

Add or update components only with the pinned legacy CLI:

```bash
pnpx starwind@2.0.1 add <name>
pnpx starwind@2.0.1 update <name>
```

Never `starwind@latest` or `starwind migrate`. Since v3 (`starwind@latest`) behavior lives in the `@starwind-ui/runtime` package, whose Astro adapter initializes on `astro:after-swap` / `starwind:init` and cleans up only on `astro:before-swap`: Swup emits none of these, and the v3 styled components still import Tabler icons. The latest CLI refuses to update a legacy project and offers to migrate. `starwind@2.0.1` reads the registry bundled in `@starwind-ui/core@2.0.1` (frozen: no fixes after it), so it works offline from starwind.dev.

The `starwind-ui` MCP server (`@starwind-ui/mcp`) and the `starwind-ui` agent skill were removed on purpose: they cover v3 only (every MCP tool generates v3 commands or docs, `migrate` included). Don't reinstall them; the starwind.dev docs also describe v3, whose events and props differ from the legacy components.

## Updating a component

`update` overwrites the whole component: the local customizations below are lost.

1. Start from a clean working tree and update one component at a time.
2. Reapply the customizations, using `git diff` to see what the CLI changed back.
3. `pnpm astro check`, then check the component in the browser.

Update only components the site uses, and only for a fix or a feature that's needed.

## Customizations to reapply after `add` or `update`

### Lifecycle

Legacy components initialize on `DOMContentLoaded` / `astro:after-swap` and clean up on `astro:before-swap` (Astro View Transitions). This project uses Swup (`.claude/rules/lifecycle.md`):

- Replace the listeners with `init('<Component>', setup)` from `@/lib/classes`.
- Keep the `WeakMap<HTMLElement, Handler>` guard in `setup()`, so a second call never creates a second instance for the same element.
- Leave `starwind:init` commented out: nothing dispatches it.
- Teardown that the old `astro:before-swap` did moves to `page:before-swap`: one listener per instance with `{ once: true }`, registered when the instance is created (`.claude/rules/lifecycle.md`), or a single listener that destroys the tracked instances (`sidebar/SidebarProvider.astro`).

Canonical example: the `<script>` of `tabs/Tabs.astro`.

### Icons

Legacy components import Tabler SVGs (`import X from '@tabler/icons/outline/x.svg'`) and can add `@tabler/icons` back to `package.json`. Convert them to carbon (`.claude/rules/icons.md`):

1. Replace the SVG imports with `import { Icon } from 'astro-icon/components';` and each `<X … />` with `<Icon name="carbon:…" … />`, keeping its props (`class`, `aria-*`, `role`, `data-*`).
2. Add the new names to the `carbon` list in `astro.config.ts`.
3. `pnpm remove @tabler/icons` if the CLI reinstalled it.
4. `grep -rn "@tabler/icons" src` must return nothing.

Tabler → Carbon, as already used (keep it consistent):

| Tabler | Carbon |
| --- | --- |
| `check` | `checkmark` |
| `x` | `close` |
| `dots` | `overflow-menu-horizontal` |
| `layout-sidebar` | `open-panel-left` |
| `loader-2` | `circle-dash` (with `animate-spin`) |
| `alert-triangle` | `warning-alt` |
| `circle-check` / `circle-x` | `checkmark-outline` / `close-outline` |
| `info-circle` | `information` |
| `minus` | `subtract` |
| `filled/circle` | `circle-solid` |
| `filled/caret-up` | `caret-up` |
| `arrow-*`, `chevron-*`, `search`, `sun`, `moon`, `cloud-upload` | same name |

Carbon icons are filled shapes, Tabler's are strokes: `stroke-*` classes and stroke animations (`stroke-dasharray` / `stroke-dashoffset`) do nothing. Drop them and animate with `clip-path`, `opacity` or `transform` (`checkbox/Checkbox.astro`).
