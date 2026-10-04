import { defineConfig, fontProviders, svgoOptimizer } from 'astro/config';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import { visualizer } from 'rollup-plugin-visualizer';
import Sonda from 'sonda/astro';

const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

// PostCSS Plugins
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnanoPlugin from 'cssnano';
import postcssUtopia from 'postcss-utopia';
import postcssNested from 'postcss-nested';
import type { Helpers, Root } from 'postcss';

// Astro Integrations
import metaTags from 'astro-meta-tags';
import favicons from 'astro-favicons';
import astroThemes from '@lpdsgn/astro-themes';

const assetsDir = '_assets';

/**
 * postcss-nested runs in a `Rule` visitor, i.e. after every plugin's `Once` hook. Tailwind 4.3
 * flattens nested rules with `@apply` in its own `Once` with native-nesting semantics
 * (`&_list` → `:is(.c-breadcrumb)_list`), so the BEM `&_suffix` must be resolved in a `Once` first.
 */
const postcssNestedFirst = {
	postcssPlugin: 'postcss-nested-first',
	Once(root: Root, { postcss }: Helpers) {
		// sync run on the same root (a Root passed to process() is mutated in place)
		void postcss([postcssNested()]).process(root, { from: root.source?.input.file }).root;
	},
};

const rolldownOutput = {
	entryFileNames: assetsDir + '/js/[name].[hash].js',
	chunkFileNames: assetsDir + '/js/chunks/[name].[hash].js',
	manualChunks(id: string) {
		// Keep animations + classes in one chunk to avoid circular-dep warnings
		if (id.includes('src/lib/animations') || id.includes('src/lib/classes/Transitions')) {
			return 'animations';
		}
	},
	assetFileNames: (assetInfo: { names?: string[] }) => {
		const ext = assetInfo.names?.[0]?.split('.').pop();

		if (ext === 'css') return assetsDir + '/css/[name].[hash][extname]';
		if (/png|jpe?g|svg|gif|webp|avif|mp4|webm/.test(ext ?? ''))
			return assetsDir + '/media/[name].[hash][extname]';
		if (/woff2?|ttf|eot|otf/.test(ext ?? '')) return assetsDir + '/fonts/[name].[hash][extname]';

		return assetsDir + '/[name].[hash][extname]'; // fallback
	},
};

// https://astro.build/config
export default defineConfig({
	// site: '',
	output: 'static',
	/**
	 * Astro 7 changed the default to 'jsx', which strips whitespace between elements using JSX rules.
	 * Keep the v6 HTML-aware behaviour. Switching to 'jsx' needs a visual pass first.
	 *
	 * @link https://docs.astro.build/en/guides/upgrade-to/v7/#new-default-whitespace-handling-compresshtml-jsx
	 */
	compressHTML: true,

	adapter: vercel({
		// Read at runtime by /api/og.png (Satori needs a static .ttf/.otf/.woff)
		includeFiles: ['src/assets/fonts/Innovator-Grotesk-VF.woff'],
	}),
	build: {
		assets: assetsDir,
		inlineStylesheets: 'never',
	},
	vite: {
		css: {
			postcss: {
				plugins: [
					postcssNestedFirst, // before tailwindcss so &_suffix nesting resolves before @apply
					postcssNested(), // flattens the nested variants Tailwind emits (&:hover, :where(&>…))
					tailwindcss({
						optimize: false, // disable Lightning CSS — it breaks postcss-nested's BEM &_suffix concatenation
					}),
					postcssUtopia({
						minWidth: 360, // Default minimum viewport
						maxWidth: 1536, // Default maximum viewport
						rootSize: 16, // Default root size
					}),
					autoprefixer(),
					...(isProd ? [cssnanoPlugin()] : []),
				],
			},
		},
		plugins: [
			...(process.env.ANALYZE // ANALYZE=1 pnpm build per generare stats.html
				? [
						visualizer({
							emitFile: true,
							filename: 'stats.html',
							template: 'flamegraph',
							gzipSize: true,
							brotliSize: true,
						}) as any,
					]
				: []),
		],
		build: {
			cssMinify: false, // handled by cssnano in postcss plugins
			sourcemap: false, // !!process.env.SOURCE_MAP | SOURCE_MAP=1 pnpm build solo quando devi debuggare in produzione
			rolldownOptions: {
				output: rolldownOutput, // applied to the prerender build by Astro
			},
		},
		environments: {
			/** Astro overrides entryFileNames/chunkFileNames in its client environment
			 * (see node_modules/astro/dist/core/build/static-build.js). User overrides
			 * must be declared here to actually reach the client build.
			 */
			client: {
				build: {
					rolldownOptions: {
						output: rolldownOutput,
					},
				},
			},
		},
	},
	integrations: [
		icon({
			iconDir: './src/assets/svgs',
			/** With on-demand routes (/api/og.png) astro-icon bundles every installed Iconify set
			 * into the server function. Only these icons ship. A missing name fails the build,
			 * so add new icons here (.claude/rules/vercel.md).
			 */
			include: {
				carbon: [
					'arrow-left',
					'arrow-right',
					'arrow-up',
					'caret-up',
					'checkmark',
					'checkmark-outline',
					'chevron-down',
					'chevron-left',
					'chevron-right',
					'circle-dash',
					'circle-solid',
					'close',
					'close-outline',
					'cloud-upload',
					'email',
					'help',
					'home',
					'information',
					'link',
					'moon',
					'open-panel-left',
					'overflow-menu-horizontal',
					'search',
					'subtract',
					'sun',
					'warning-alt',
				],
				'simple-icons': ['behance', 'discord', 'github', 'instagram', 'linkedin', 'rss'],
			},
		}),
		mdx(),
		favicons({
			name: 'Astro Boilerplate',
			short_name: 'Astro Boilerplate',
		}),
		...(isDev
			? [
					metaTags(),
					astroThemes({
						devToolbar: true,
					}),
				]
			: []),
		...(process.env.ANALYZE
			? [
					Sonda({
						server: true,
						deep: true,
						gzip: true,
						brotli: true,
					}),
				]
			: []),
	],
	devToolbar: {
		enabled: true,
	},
	image: {
		domains: ['locomotive.ca'],
		responsiveStyles: true,
		layout: 'constrained',
		breakpoints: [640, 768, 900, 1024, 1280, 1440, 1920],
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Innovator Grotesk',
			cssVariable: '--font-sans',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						weight: '100 900',
						style: 'normal',
						display: 'swap',
						featureSettings: `"liga", "calt", "dlig", "ss01", "cv02", "cv06", "cv10", "cv11", "zero", "tnum";`,
						src: ['./src/assets/fonts/Innovator-Grotesk-VF.woff2'],
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'JetBrains Mono',
			cssVariable: '--font-mono',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						weight: '100 900',
						style: 'normal',
						display: 'swap',
						src: ['./src/assets/fonts/JetBrains-Mono-VF.woff2'],
					},
				],
			},
		},
	],
	experimental: {
		svgOptimizer: svgoOptimizer({
			plugins: ['preset-default', { name: 'removeViewBox' }],
		}),
		chromeDevtoolsWorkspace: true,
		contentIntellisense: true,
	},
	server: {
		port: 8888,
		host: '0.0.0.0',
	},
});
