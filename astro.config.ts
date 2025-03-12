// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import mailObfuscation from "astro-mail-obfuscation";
import metaTags from "astro-meta-tags";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import compressor from "astro-compressor";
import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		icon(),
		mailObfuscation(),
		metaTags(),
		sitemap(),
		compressor(),
		robotsTxt({
			sitemap: false,
			policy: [
				{
					userAgent: "*",
					disallow: "/",
					crawlDelay: 2,
				},
			],
		}),
	],
	adapter: vercel({
		imageService: true,
		devImageService: "sharp",
	}),
});