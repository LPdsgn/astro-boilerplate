import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

const isProd = import.meta.env.PROD;

import postcssHelpersFunctions from '@locomotivemtl/postcss-helpers-functions';
import postcssTailwindShortcuts from '@locomotivemtl/postcss-tailwind-shortcuts';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnanoPlugin from 'cssnano';
// PostCSS Plugins
import nested from 'postcss-nested';
import postcssUtopia from 'postcss-utopia';

// https://astro.build/config
export default defineConfig({
	site: 'https://locomotive-astro-boilerplate.vercel.app',
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
					nested(),
					tailwindcss(),
					postcssUtopia({
						minWidth: 360, // Default minimum viewport
						maxWidth: 1536, // Default maximum viewport
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
				provider: 'local',
				name: 'Source Sans Pro',
				cssVariable: '--custom-font-sans',
				fallbacks: ['sans-serif'],
				variants: [
					{
						weight: 400,
						style: 'normal',
						display: 'swap',
						src: ['./src/assets/fonts/SourceSans3-Regular.woff2'],
					},
					{
						weight: 700,
						style: 'normal',
						display: 'swap',
						src: ['./src/assets/fonts/SourceSans3-Bold.woff2'],
					},
				],
			},
		],
	},
	server: {
		port: 8888,
		host: '0.0.0.0',
	},
});
