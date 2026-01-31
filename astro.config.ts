import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

const isProd = import.meta.env.PROD;

// PostCSS Plugins
import postcssHelpersFunctions from '@locomotivemtl/postcss-helpers-functions';
import postcssTailwindShortcuts from '@locomotivemtl/postcss-tailwind-shortcuts';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnanoPlugin from 'cssnano';
import postcssUtopia from 'postcss-utopia';

// Astro Integrations
import metaTags from 'astro-meta-tags';
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
					tailwindcss(),
					postcssUtopia({
						minWidth: 360, // Default minimum viewport
						maxWidth: 1536, // Default maximum viewport
						rootSize: 16, // Default root size
					}),
					postcssHelpersFunctions(),
					postcssTailwindShortcuts(),
					autoprefixer(),
					cssnanoPlugin(),
				],
			},
		},
	},
	integrations: [
		icon({
			iconDir: './src/assets/svgs',
		}),
		metaTags(),
		astroThemes(),
	],
	devToolbar: {
		enabled: true,
	},
	image: {
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
