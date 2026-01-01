import { defineConfig } from 'astro/config';
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
		enabled: false,
	},
	image: {
		domains: ['locomotive.ca'],
		remotePatterns: [{ protocol: 'https' }],
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
});
