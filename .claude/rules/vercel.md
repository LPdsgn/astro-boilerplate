---
paths:
  - "astro.config.ts"
  - "vercel.ts"
  - "src/pages/api/**"
  - "package.json"
---

# Vercel Function Size & Deployment Storage

Every deployment (production and preview) is stored in full and counts toward the team's Deployment Storage quota (10 GB on the free plan). The on-demand routes (`prerender = false`, e.g. `/api/og.png`) share one function, `.vercel/output/functions/_render.func`. Whatever lands in it is stored again on every push.

Reference size: function **~23 MB** (almost all `node_modules`). Check after changes that touch the server bundle:

```bash
pnpm astro build && du -sh .vercel/output/functions/_render.func/*
```

`src/` inside the function should only hold the OG font (~64 KB). `dist/` should be a few MB.

## Reading files at runtime

Vercel's file tracer (`@vercel/nft`) statically follows `fs` calls. If a path resolves to a **directory**, it bundles the whole directory:

```ts
// ❌ bundles all of src/assets into the function
const assetsDir = join(process.cwd(), 'src', 'assets');
readFile(join(assetsDir, 'fonts/Innovator-Grotesk-VF.woff'));

// ✅ traces only this file
readFile(join(process.cwd(), 'src/assets/fonts/Innovator-Grotesk-VF.woff'));
```

- Write the full file path as a literal at the call site. Don't pass a base directory to a helper.
- Use `process.cwd()`, not `import.meta.url`: once the route is bundled, `import.meta.url` no longer points to `src/`.
- Also list every runtime-read file in `includeFiles` of the Vercel adapter (`astro.config.ts`).

## astro-icon

When on-demand routes exist, astro-icon bundles every installed `@iconify-json/*` set into the server function. Sets listed in `include` are filtered; **sets that aren't listed are bundled whole**.

- A new icon needs an entry in `include` (`astro.config.ts`). Otherwise the build fails with "Unable to locate icon".
- A new Iconify set needs a new `include` key too, or all its icons ship.
- Remove `@iconify-json/*` packages that aren't used (`logos` alone was 7.3 MB).

## Retention

Set a retention policy (project Settings → Deployment Retention), e.g. production/preview 14 days, errored 7, canceled 1. Vercel still keeps the last 10 production deployments (`deploymentsToKeep`), so bulk cleanup needs manual removal:

```bash
vercel remove <dpl_id> --yes --scope <team>
```

Keep the current production deployment and a couple of rollback targets.
