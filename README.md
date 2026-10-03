<p align="center">
    <a href="https://github.com/locomotivemtl/locomotive-boilerplate">
        <img src="https://user-images.githubusercontent.com/4596862/54868065-c2aea200-4d5e-11e9-9ce3-e0013c15f48c.png" height="140">
    </a>
</p>
<h1 align="center">Locomotive Astro Boilerplate</h1>
<p align="center">Astro boilerplate for projects by <a href="https://locomotive.ca/">Locomotive</a>.</p>

## Features

- [PostCSS] for a feature rich superset of CSS.
- [Tailwind CSS] for a sane and scalable CSS architecture.
- [Locomotive Scroll] for smooth scrolling with parallax effects.
- [Swup] for versatile and extensible page transitions.
- [Prettier] for a formatted and easy to maintain codebase.
- [Nanostores] as state manager.

## Getting started

Make sure you have the following installed:

- [Node] — at least 22.12 (Astro 7 minimum), the latest LTS is recommended.
- [pnpm] — at least 11 (the version is pinned in `packageManager`).

> 💡 You can use [NVM] to install and use different versions of Node via the command-line.

```sh
# Clone the repository.
git clone https://github.com/locomotivemtl/astro-boilerplate.git my-new-project

# Enter the newly-cloned directory.
cd my-new-project
```

## Installation

```sh
# Switch to recommended Node version from .nvmrc
nvm use

# Install dependencies (also installs the lefthook git hooks)
pnpm install
```

## Development

```sh
# Start development server, watch for changes, and compile assets
pnpm dev

# Type check, compile and minify assets
pnpm build
```

## Commands

All commands are run from the root of the project, from a terminal:

| Command             | Action                                           |
| :------------------ | :----------------------------------------------- |
| `pnpm install`      | Installs dependencies                            |
| `pnpm dev`          | Starts local dev server at `localhost:8888`      |
| `pnpm build`        | Type check and build the production site         |
| `pnpm preview`      | Preview your build locally, before deploying     |
| `pnpm astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro --help` | Get help using the Astro CLI                     |
| `pnpm lint`         | Lint files using ESLint                          |
| `pnpm format`       | Format files using Prettier                      |

## Documentation

- [Astro]
- [Locomotive Scroll]
- [Tailwind CSS]
- [Swup]
- [Prettier]
- [Nanostores]

[Astro]: https://docs.astro.build/en/getting-started/
[Tailwind CSS]: https://tailwindcss.com/docs/installation
[Locomotive Scroll]: https://scroll.locomotive.ca/docs
[Swup]: https://swup.js.org/getting-started/
[Node]: https://nodejs.org/
[pnpm]: https://pnpm.io/
[NVM]: https://github.com/nvm-sh/nvm
[Prettier]: https://prettier.io/
[Nanostores]: https://github.com/nanostores/nanostores
[PostCSS]: https://postcss.org/
