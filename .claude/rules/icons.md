---
paths:
  - "**/*.astro"
  - "**/*.ts"
---

# Icon Rules

When using icons in Astro components, follow these rules:

- Always use the `<Icon name="icon-name" />` component imported from `astro-icon` when adding icons.
- Use the `carbon` icon set for general UI icons.
- Use the `simple-icons` set for brand logos.
- Ensure that any new icons added to the project are included in the Astro icon configuration (`astro.config.ts`) to avoid build failures.
- Icon names chosen at runtime come from maps of full literal names (`GitHub: 'simple-icons:github'`), never from template strings, so a search for `carbon:` / `simple-icons:` finds every icon to list.

Converting the Tabler icons of Starwind components: `.claude/rules/starwind.md`.

Pitfalls:

- **Filled, not stroked.** Carbon icons are filled shapes: `stroke-*` classes and stroke animations do nothing on them.
- **Icon as the component root.** Type the props from `<Icon>`: `Omit<ComponentProps<typeof Icon>, 'name' | …>`. `HTMLAttributes<'svg'>` allows `width: null`, which `<Icon>` rejects (`ui/spinner/Spinner.astro`).
- **Icon per variant.** Map the variant to the icon *name* and render a single `<Icon name={…} />` instead of a map of components; never call a local variable `Icon`, it shadows the import (`ui/toast/ToastTitle.astro`).
- **Accessibility.** `<Icon>` adds no `aria-hidden` of its own: keep whatever the original SVG had.
- **Size.** `<Icon>` renders at the set's intrinsic size (32px for carbon) unless a `size-*` class or a parent selector such as `[&_svg]:size-4` or Button's `[&_svg:not([class*='size-'])]` sizes it: give a bare `<Icon />` one of the two.
