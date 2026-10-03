---
paths:
  - "**/*.astro"
  - "**/index.ts"
---

# Astro Component Conventions

## File layout
- A self-contained component (one `.astro` file) lives directly in its group folder: `src/components/ui/ScrollToTopButton.astro`, `src/components/ui/SocialIcons.astro`. No folder for a single file.
- A component with co-located files (`.css`, `.ts`, barrel `index.ts`) gets its own kebab-case folder named after it: `src/components/ui/hover-image/HoverImage.astro` + `hover-image.css` + `index.ts`.
- Superseded components move to an `old/` folder inside their group and stay exported from the barrel as `@deprecated` aliases until removed.
- Import through the group barrel (`@/components/ui`, `@/components/layout`), never by folder path.

## Props
- Extend `HTMLAttributes<'element'>` from `astro/types` for proper HTML attribute passthrough
- When using TV variants, also extend `VariantProps<typeof variantName>`
- Always destructure `class: className` to avoid reserved word conflicts, then spread `...rest`

## Barrel exports
- Component index files must export both the component AND its TV variants:
  ```ts
  import Button, { buttonVariants } from './Button.astro';
  export { Button, buttonVariants };
  export default Button;
  ```
- Compound components (Tabs, Dialog, Sidebar) export all sub-components plus a variants object and a default object with named parts (`Root`, `Content`, `Trigger`, etc.)

## Polymorphic elements
- Support dynamic tag selection via props when a component can render as different elements:
  - `as` prop for container-style components (e.g. `as: 'div' | 'section' | 'article'`)
  - Conditional tag for link/button duality: `const Tag = Astro.props.href ? 'a' : 'button'`

## SEO
- Pages: pass `seo` prop to Layout via `getSeo()` from `src/lib/seo.ts`
- Content collection pages: use `getContentSEO(entry)` which extracts title, description, image, and dates automatically
- Layout handles all fallbacks from `SITE.default` in `src/site.config.ts`

## Swup page transitions

See `.claude/rules/lifecycle.md` for the full page lifecycle documentation (SwupScriptsPlugin, custom events, script placement, initialization patterns).

## Starwind components

Components copied from Starwind into `src/components/ui/` (listed in `starwind.config.json`) follow `.claude/rules/starwind.md`: legacy CLI only, and lifecycle and icons customized after every add or update.
