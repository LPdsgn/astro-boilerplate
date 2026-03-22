---
paths:
  - "**/*.astro"
  - "**/index.ts"
---

# Astro Component Conventions

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
