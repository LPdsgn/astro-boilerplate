---
paths:
  - "**/*.ts"
  - "**/*.astro"
---

# TypeScript Conventions

- Shared utility functions go in the appropriate file under `src/lib/utils/` and must be added to the barrel export. Place utilities in an existing file of the same domain rather than creating a new single-function file
- For long/complex scripts, use a dedicated `.ts` file co-located with the consuming component (or in a shared location), imported in Astro via `<script src="./filename.ts"></script>`
- External scripts that need initialization:
  ```astro
  <script>
    import X from 'Y';
    X.init(/* ... */);
  </script>
  ```
- **GSAP animations must always use the AnimationManager** so their lifecycle is properly coordinated with Swup page transitions. See `.docs/animation-manager.md` for the full API.

## Script initialization & lifecycle

See `.claude/rules/lifecycle.md` for the full page lifecycle documentation, including the `init(key, func)` helper, manual patterns, caveats, and decision guide.
