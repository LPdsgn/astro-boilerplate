import type { APIRoute } from 'astro';
import { satoriAstroOG } from 'satori-astro';
import { html } from 'satori-html';
import { SITE } from '@/site.config';

/**
 * Dynamic OG Image Generator
 *
 * Usage: /api/og.png?title=Title&description=Description
 *
 * NOTE: Satori doesn't support .woff2. Fonts must be in .ttf, .otf, or .woff format.
 * This implementation uses Google Fonts (Inter) for maximum compatibility.
 */

// Disable prerendering to have access to query params at runtime
export const prerender = false;

// Font cache (avoids reloading on every request)
let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFonts() {
	if (fontCache) return fontCache;

	// Use Google Fonts (Inter) - .woff format supported by Satori
	const [regularRes, boldRes] = await Promise.all([
		fetch(
			'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
		),
		fetch(
			'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff'
		),
	]);

	fontCache = {
		regular: await regularRes.arrayBuffer(),
		bold: await boldRes.arrayBuffer(),
	};

	return fontCache;
}

export const GET: APIRoute = async ({ url }) => {
	// Extract title and description from query params
	const title = url.searchParams.get('title') || SITE.default.title;
	const description = url.searchParams.get('description') || SITE.default.description;

	// Debug log
	console.log('[OG Image] URL:', url.toString());
	console.log('[OG Image] Title:', title);
	console.log('[OG Image] Description:', description);

	const fonts = await loadFonts();

	// Truncate description if too long
	const truncatedDescription =
		description.length > 120 ? description.slice(0, 117) + '...' : description;

	return await satoriAstroOG({
		template: html`
			<div
				style="
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				width: 100%;
				height: 100%;
				padding: 80px;
				background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
				font-family: 'Inter', sans-serif;
			"
			>
				<!-- Top bar with logo/brand -->
				<div style="display: flex; align-items: center; gap: 16px;">
					<div
						style="
						width: 48px;
						height: 48px;
						background: #fff;
						border-radius: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
						font-weight: 700;
						font-size: 24px;
						color: #0a0a0a;
					"
					>
						AB
					</div>
					<span style="color: #666; font-size: 24px;">Astro Boilerplate</span>
				</div>

				<!-- Content -->
				<div
					style="display: flex; flex-direction: column; gap: 24px; flex: 1; justify-content: center;"
				>
					<h1
						style="
						color: #ffffff;
						font-size: 72px;
						font-weight: 700;
						margin: 0;
						line-height: 1.1;
						max-width: 900px;
					"
					>
						${title}
					</h1>

					<p
						style="
						color: #999;
						font-size: 32px;
						margin: 0;
						line-height: 1.4;
						max-width: 800px;
					"
					>
						${truncatedDescription}
					</p>
				</div>

				<!-- Footer -->
				<div style="display: flex; justify-content: space-between; align-items: center;">
					<span style="color: #444; font-size: 20px;">Powered by Astro</span>
					<span style="color: #444; font-size: 20px;">astro-boilerplate-new</span>
				</div>
			</div>
		`,
		width: 1200,
		height: 630,
	}).toResponse({
		satori: {
			fonts: [
				{
					name: 'Inter',
					data: fonts.regular,
					weight: 400,
					style: 'normal',
				},
				{
					name: 'Inter',
					data: fonts.bold,
					weight: 700,
					style: 'normal',
				},
			],
		},
	});
};
