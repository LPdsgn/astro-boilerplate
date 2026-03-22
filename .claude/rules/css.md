---
paths:
  - "**/*.css"
  - "**/*.astro"
---

# CSS Conventions

- Use **BEM syntax** for CSS class names
- Prefer readable, self-explanatory CSS class names with Tailwind's `@apply` over stacking many Tailwind utility classes directly on elements
- For long CSS, use a dedicated `.css` file co-located with the consuming component and imported in its frontmatter
- New CSS files and `<style>` blocks in Astro components that need Tailwind access must start with `@reference "#styles";`

## Component variant pattern (tailwind-variants + BEM)

UI components use `tv()` from `tailwind-variants` as a type-safe variant dispatcher, with BEM modifier classes as variant values — not Tailwind utilities. Actual styles live in a `<style>` block using `@apply`. See `src/components/ui/button/Button.astro` for the canonical example.

- Variant values should be BEM modifiers (e.g. `-default`, `-small`), not Tailwind classes
- All visual styling goes in the `<style>` block via `@apply`, scoped under `@layer components`
- Since variant values are BEM classes (not Tailwind utilities), use `tailwind-variants/lite` to skip unnecessary tailwind-merge overhead — unless the component also accepts a `class` prop that consumers may use to pass Tailwind overrides, in which case use the full `tv()` import

## Data attributes

- **`data-slot`**: All components must include a `data-slot` attribute identifying the component type (e.g. `data-slot="button"`, `data-slot="tabs-trigger"`). Used for DOM querying and CSS targeting.
- **`data-state`**: Interactive components use `data-state="open|closed|active|inactive"` to reflect current state. CSS targets these via `data-[state=active]:` selectors.
