![Build the web you want](https://raw.githubusercontent.com/withastro/astro/refs/heads/main/.github/assets/banner.jpg 'Build the web you want')
<h1 align="center">🚀 Astro Boilerplate</h1>
<p align="center">Boilerplate for Astro projects</p>

## Features
- [PostCSS](https://docs.astro.build/en/guides/styling/#postcss) for a feature rich superset of CSS.
  - [postcss-nested](https://github.com/postcss/postcss-nested#readme): Support for nested CSS in PostCSS
  - [postcss-utopia](https://github.com/trys/postcss-utopia#readme): PostCSS plugin for responsive design
  - [autoprefixer](https://github.com/postcss/autoprefixer#readme): Automatically adds vendor prefixes to CSS
  - [cssnano](https://github.com/cssnano/cssnano#readme): CSS optimization and minification
- [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/astro) for a sane and scalable CSS architecture.
- [Prettier](https://prettier.io/) for a formatted and easy to maintain codebase.
- [Locomotive Scroll](https://github.com/locomotivemtl/locomotive-scroll/tree/v5-beta#readme) for smooth scrolling with parallax effects.
  - [Lenis](https://github.com/darkroomengineering/lenis#readme) is included as a subdependency, so you can initialize a Lenis instance instead if you prefer.

### Additional features

#### SEO

- [astro-seo](https://github.com/jonasmerlin/astro-seo#readme): SEO optimization for Astro projects
- [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap): Sitemap generation for Astro projects
- [astro-robots-txt](https://github.com/alextim/astro-lib/tree/main/packages/astro-robots-txt#readme): Generation of robots.txt file

#### Utility

- [astro-capo](https://github.com/natemoo-re/astro-capo#readme): Plugin to optimize head tag loading
- [astro-compressor](https://github.com/sondr3/astro-compressor#readme): Asset compression for Astro projects
- [astro-mail-obfuscation](https://github.com/andreas-brunner/astro-mail-obfuscation#readme): Protection of email addresses against bots
- [astro-meta-tags](https://github.com/patrick91/astro-meta-tags#readme): DevToolbar extension for meta tags checking

#### Deployment
- [@astrojs/vercel](https://docs.astro.build/en/guides/integrations-guide/vercel): Integration for deployment on Vercel
  - [@vercel/analytics@1.4.0](https://vercel.com/docs/analytics/quickstart): Vercel Web Analytics component
  - [@vercel/speed-insights](https://vercel.com/docs/speed-insights/quickstart): Vercel SpeedInsights component

#### Components

- [astro-embed](https://astro-embed.netlify.app/getting-started): Components for embedding external content
- [astro-icon](https://www.astroicon.dev/getting-started): Icon management for Astro
- [astro-loading-indicator](https://github.com/florian-lefebvre/astro-loading-indicator/blob/main/package/README.md): Loading indicator for navigation

## Getting started

Make sure you have the following installed:

- [Node] — at least 20.3, the latest LTS is recommended.
- [pnpm] — at least 10.4, the latest LTS is recommended.

> 💡 You can use [NVM] to install and use different versions of Node via the command-line.

```sh
# Clone the repository.
git clone https://github.com/lpdsgn/astro-boilerplate.git my-new-project

# Enter the newly-cloned directory.
cd my-new-project
```

## Installation

```sh
# Switch to recommended Node version from .nvmrc
nvm use

# Install dependencies from package.json
pnpm install
```

## Development

```sh
# Start development server, watch for changes, and compile assets
pnpm dev

# Compile and minify assets
pnpm build
```

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |
| `pnpm format`          | Format files using prettier                      |
