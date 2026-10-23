<h1 align="center">astro-boilerplate</h1>
<p align="center">Astro starter with a fluid design system, Swup page transitions, GSAP and a markdown journal.</p>

A fork of [Locomotive's Astro boilerplate](https://github.com/locomotivemtl/astro-boilerplate), grown
alongside [luigipdt.dev](https://luigipdt.dev). The blog comes from
[astro-erudite](https://github.com/jktrn/astro-erudite) by jktrn; the UI components from
[Starwind](https://starwind.dev) (legacy 2.0.1).

## What's inside

- **Astro 7** (static, Vercel adapter) with **Tailwind CSS v4** through PostCSS: `postcss-nested`,
  `postcss-utopia` for fluid values, cssnano in production
- **Design system**: semantic colors with a dark and a light theme (`.theme-dark` / `.theme-light`,
  switched by [`@lpdsgn/astro-themes`](https://github.com/LPdsgn/astro-themes)), a fluid spacing
  scale (`--spacing-3xs` … `--spacing-4xl`, Utopia 360–1536px), a fluid type scale
  (`heading-*` / `text-*` utilities), Inter and JetBrains Mono. `tokens.json` is generated from
  the CSS in Tokens Studio format (`pnpm tokens:build`) and checked on every commit
- **Components**: Starwind 2.0.1 set restyled on the tokens (BEM classes + `tv()` variants), plus
  Container, Image, HoverImage, Breadcrumbs, PageTitle, ScrollToTop
- **Journal**: content collections for blog and legal pages, series (a folder per series, parts
  ordered by `order`), tags, RSS, sitemap. Markdown goes through
  [Sätteri](https://github.com/withastro/astro/tree/main/packages/markdown/satteri): callouts as
  native `<details>`, [Expressive Code](https://expressive-code.com) blocks with line numbers and
  collapsible sections, inline code with a language, Temml math
- **Motion**: [Swup 4](https://swup.js.org) transitions, [LocomotiveScroll 5](https://scroll.locomotive.ca),
  GSAP 3 with [gsap-encore](https://github.com/LPdsgn/gsap-encore) reverting every animation on
  page swaps (see `docs/encore.md`)
- **Tooling**: TypeScript, ESLint, Prettier, lefthook (lint on commit, build on push), Vitest,
  Renovate, Nanostores, astro-icon (Carbon and Simple Icons), dynamic OG images with Satori

The home page is a showcase of the tokens and components; `/blog` holds a sample series.

## Getting started

- [Node](https://nodejs.org/) 24 (`.nvmrc`; Astro 7.4 needs at least 22.23.4)
- [pnpm](https://pnpm.io/) 12 (pinned in `packageManager`)

```sh
git clone https://github.com/LPdsgn/astro-boilerplate.git my-new-project
cd my-new-project
nvm use
pnpm install   # also installs the lefthook git hooks
pnpm dev       # https://localhost:8888
```

Then make it yours: `src/site.config.ts` (site, navigation, social links), `astro.config.ts`
(`site`, fonts, icons), `src/styles/theme.css` (colors), `src/content/blog` (posts).

## Commands

| Command              | Action                                                   |
| :------------------- | :------------------------------------------------------- |
| `pnpm dev`           | Start the dev server at `localhost:8888`                 |
| `pnpm build`         | Token check, type check and production build             |
| `pnpm preview`       | Preview the production build                             |
| `pnpm check`         | Astro type checking only                                 |
| `pnpm lint`          | ESLint                                                   |
| `pnpm format`        | Prettier                                                 |
| `pnpm test`          | Vitest (token pipeline, SEO helpers)                     |
| `pnpm tokens:build`  | Regenerate `tokens.json` from `src/styles`               |
| `pnpm tokens:check`  | Verify `tokens.json` is in sync (runs in the pre-commit) |
| `ANALYZE=1 pnpm build` | Build with the Sonda bundle report                     |

## Writing a post

Posts live in `src/content/blog`. A single post is `my-post.mdx` or `my-post/index.mdx` (with its
images next to it). A series is a folder: `index.mdx` is the parent, every other file is a part
with an `order`; parts render inside the parent page and keep their own URL. Frontmatter:
`title`, `description`, `date`, `cover`, `coverAlt`, `tags`, `draft`, `order`.

Callouts: `:::note`, `:::tip[Label]{closed}`, `:::warning`, `:::caution`, `:::important`.
Code fences accept `title`, line ranges (`{2-3}`), `showLineNumbers` and `collapse={5-8}`;
inline code can carry a language: `` `code{:ts}` ``. Math uses `$…$` and `$$…$$`.

## Credits

- [locomotivemtl/astro-boilerplate](https://github.com/locomotivemtl/astro-boilerplate), the origin
- [jktrn/astro-erudite](https://github.com/jktrn/astro-erudite), the journal (series, table of contents, prose styles)
- [Starwind](https://starwind.dev), the component set

[MIT](./LICENSE)
