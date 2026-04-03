import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import { visualizer } from 'rollup-plugin-visualizer';
import Sonda from 'sonda/astro';

const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

// PostCSS Plugins
import postcssHelpersFunctions from '@locomotivemtl/postcss-helpers-functions';
import postcssTailwindShortcuts from '@locomotivemtl/postcss-tailwind-shortcuts';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnanoPlugin from 'cssnano';
import postcssUtopia from 'postcss-utopia';
import postcssNested from 'postcss-nested';

// Astro Integrations
import metaTags from 'astro-meta-tags';
import favicons from 'astro-favicons';
import astroThemes from '@lpdsgn/astro-themes';

// https://astro.build/config
export default defineConfig({
	// site: '',
	output: 'static',
	adapter: vercel({
		webAnalytics: {
			enabled: true,
		},
	}),
	vite: {
		css: {
			postcss: {
				plugins: [
					postcssNested(), // before tailwindcss so &_suffix nesting resolves before @apply
					tailwindcss({
						optimize: false, // disable Lightning CSS — it breaks postcss-nested's BEM &_suffix concatenation
					}),
					postcssUtopia({
						minWidth: 360, // Default minimum viewport
						maxWidth: 1536, // Default maximum viewport
						rootSize: 16, // Default root size
					}),
					postcssHelpersFunctions(),
					postcssTailwindShortcuts(),
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
			sourcemap: false, // !!process.env.SOURCE_MAP | SOURCE_MAP=1 pnpm build solo quando devi debuggare in produzione
			/* rollupOptions: {
				output: {
					manualChunks(id) {
						// Keep animations + classes in one chunk to avoid circular-dep warnings
						if (id.includes('src/lib/animations') || id.includes('src/lib/classes/')) {
							return 'animations';
						}
					},
				},
			}, */
		},
	},
	integrations: [
		icon({
			iconDir: './src/assets/svgs',
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
	experimental: {
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
	},
	server: {
		port: 8888,
		host: '0.0.0.0',
	},
});
