# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro project boilerplate built with **Astro 7** as a static site, deployed on **Vercel**. Uses Locomotive's boilerplate as a foundation with GSAP animations, Swup page transitions, and LocomotiveScroll smooth scrolling.

## Commands

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `pnpm dev`             | Start dev server at localhost:8888 |
| `pnpm dev:stop`        | Stop a dev server running in background |
| `pnpm build`           | Type check + Astro build           |
| `pnpm check`           | Astro type checking only           |
| `pnpm lint`            | ESLint check                       |
| `pnpm lint:fix`        | ESLint auto-fix                    |
| `pnpm format`          | Prettier format all files          |
| `pnpm preview`         | Preview production build           |
| `pnpm clean`           | Remove `dist`, `.astro`, `.vercel/output` |
| `ANALYZE=1 pnpm build` | Build with bundle visualization    |

**Package manager:** pnpm 11 (settings in `pnpm-workspace.yaml`, not in `package.json`). **Node:** 22.12+ (Astro 7 minimum; see `.nvmrc`). One-off package binaries run with `pnpx <pkg>` (or `pnpm dlx <pkg>`), never `npx`.

**Git hooks (lefthook, `lefthook.yml`):** pre-commit runs ESLint + Prettier on staged files. Pre-push runs the full build.

## Architecture

### Stack

- **Astro 7** (static output) with Vercel adapter, Vite 8 (rolldown). Vercel project config in `vercel.ts` (`@vercel/config`)
- **Tailwind CSS v4** with PostCSS pipeline (postcss-nested, postcss-utopia for fluid design, cssnano in production)
- **GSAP 3** + ScrollTrigger for animations
- **Swup 4** for SPA-like page transitions
- **LocomotiveScroll 5** for smooth scrolling and parallax
- **Nanostores** for lightweight reactive state
- **Starwind** component library (legacy, components listed in `starwind.config.json`)
- **astro-icon** with the `carbon` (UI) and `simple-icons` (brands) Iconify sets

### Key Directories

- `src/pages/` — File-based routing (`api/og.png.ts` is the only on-demand route)
- `src/components/ui/` — Starwind design system components (Button, Dialog, Toast, Tabs, etc.) and project UI components
- `src/components/layout/` — Header, Footer, Breadcrumb, CookieConsent
- `src/components/analytics/` — Analytics providers (GA, GTM, Clarity, PostHog, Matomo)
- `src/lib/classes/` — AnimationManager (GSAP coordinator), Transitions (Swup), Scroll (LocomotiveScroll), Lightbox
- `src/lib/stores/` — Nanostores: screen, mouse, scroll, deviceStatus, localStorage
- `src/lib/utils/` — Helpers for UI, devices, data, maths, string, query, lightbox
- `src/styles/` — CSS layer system: main.css imports tailwind.css, typography.css, utilities.css
- `src/site.config.ts` — Global config (SITE, NAV_LINKS, SOCIAL_LINKS)

### TypeScript Path Aliases

`@/*`, `@components/*`, `@layouts/*`, `@images/*`, `@pages/*`, `@lib/*`, `@styles/*`, `@templates/*`, `@types/*`, `@data/*` — all mapped in tsconfig.json.

### Page Lifecycle (Swup transitions + script execution)

1. **`Transitions`** class initializes Swup with HeadPlugin, PreloadPlugin, ScriptsPlugin and dispatches three custom `document` events: `page:before-preparation` (visit starts), `page:before-swap` (before DOM swap), `page:load` (after DOM swap)
2. **`AnimationManager`** singleton coordinates GSAP animations — cleans up on `before('content:replace')`, refreshes ScrollTriggers on `content:replace`
3. **`Scroll`** class wraps LocomotiveScroll — destroyed before content replace, re-initialized after
4. **SwupScriptsPlugin is required** — Astro hoists and bundles `<script>` tags, so they only execute on initial browser load. On Swup navigations, the browser won't re-execute scripts inserted via innerHTML. ScriptsPlugin forces re-execution of scripts found in swapped HTML, which is essential for both page-specific and component scripts (e.g. sidebar, lightbox). Without it, scripts from pages never directly visited would never execute.

Page/component scripts use the `init(key, func)` helper from `@lib/classes/Transitions`, which handles first-load execution and `page:load` re-initialization with `AbortController`-based listener deduplication. **Do not use `init()` for persistent `AM.setup()` calls or scripts outside Swup containers** — see `.claude/rules/lifecycle.md` for caveats and the legacy manual pattern.

For full AM API, usage patterns, and the `setup()` context pattern, see [`docs/animation-manager.md`](docs/animation-manager.md).

### Styling System

- **Tailwind v4** with CSS variables for theming
- **Dark mode** via the `.dark` class (`@custom-variant dark`), toggled by `@lpdsgn/astro-themes` (`ThemeProvider` in `Layout.astro`)
- **Utopia fluid design** — responsive typography and spacing scaled between 360px–1536px viewports using `clamp()`
- **Design tokens as CSS variables:** `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--unit-sm`, `--unit-md`, etc.
- **Page layout:** side margin `--spacing-margin`, gutter `--spacing-gutter`, 12 columns. `.container` and the default `Container` use `px-well` (margin below `--container-grid` = 1920px, then centered content with full-width backgrounds). The dev grid helper (`Ctrl+G`, `src/lib/app.ts`) uses the same values: change them together
- **Fonts:** Innovator Grotesk (`--font-sans`), JetBrains Mono (`--font-mono`), via the Astro Fonts API (`astro.config.ts`)

## Coding Conventions

### Formatting

- **Tabs** (3-space width), single quotes, trailing commas (es5), semicolons
- Prettier + ESLint enforced via lefthook on commit

### Naming

- **Folders:** kebab-case, only for components with co-located `.css`/`.ts` files; a single-file component sits directly in its group folder (see `.claude/rules/components.md`)
- **Astro files:** CamelCase (e.g. `ScrollToTopButton.astro`, `SocialIcons.astro`)
- **TS/JS files:** Capital case for class files (e.g. `AnimationManager.ts`), standard or kebab-case for snippet/function/barrel files (e.g. `devices.ts`, `setViewportSize.ts`)

CSS, TypeScript, icon, Starwind and Vercel function-size conventions are in `.claude/rules/` (loaded automatically when editing matching files). Before reading files at runtime in an on-demand route, see `.claude/rules/vercel.md`: a directory path bundles the whole folder into the Vercel function.
