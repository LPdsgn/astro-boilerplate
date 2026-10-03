import type { APIRoute } from 'astro';
import { satoriAstroOG } from 'satori-astro';
import { html } from 'satori-html';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE } from '@/site.config';

/**
 * Dynamic OG Image Generator
 *
 * Usage: /api/og.png?title=Title&description=Description
 *
 * NOTE: Satori doesn't support .woff2 and ignores variable-font axes (it renders the default
 * instance). Fonts must be in .ttf, .otf, or .woff format and listed in `includeFiles` of the
 * Vercel adapter (astro.config.ts) to reach the function.
 */

// Disable prerendering to have access to query params at runtime
export const prerender = false;

// Font cache (avoids reloading on every request)
let fontCache: ArrayBuffer | null = null;

async function loadFont() {
	if (fontCache) return fontCache;

	// process.cwd(): import.meta.url no longer points to src/ once the route is bundled.
	// Full file path literal at the call site: a directory would make Vercel's file tracer
	// bundle the whole folder into the function (.claude/rules/vercel.md).
	const fontBuffer = await readFile(
		join(process.cwd(), 'src/assets/fonts/Innovator-Grotesk-VF.woff')
	);
	fontCache = fontBuffer.buffer.slice(
		fontBuffer.byteOffset,
		fontBuffer.byteOffset + fontBuffer.byteLength
	);

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

	const font = await loadFont();

	// Truncate description if too long
	const truncatedDescription =
		description.length > 120 ? description.slice(0, 117) + '...' : description;

	return await satoriAstroOG({
		template: html`
			<div
				style="
					display: flex;
					height: 100%;
					width: 100%;
					align-items: center;
					justify-content: center;
					letter-spacing: -.02em;
					font-weight: 700;
					background: white;
					font-family: 'Innovator Grotesk';
				"
			>
				<div
					style="
						left: 42px;
						top: 42px;
						position: absolute;
						display: flex;
						align-items: center;
					"
				>
					<span
						style="
							width: 24px;
							height: 24px;
							background: black;
						"
					></span>
					<span
						style="
							margin-left: 8px;
							font-size: 20px;
						"
					>
						Astro Boilerplate
					</span>
				</div>
				<div
					style="
						display: flex;
						flex-wrap: wrap;
						justify-content: center;
						padding: 20px 50px;
						margin: 0 42px;
						font-size: 40px;
						width: auto;
						max-width: 550px;
						text-align: center;
						background-color: black;
						color: white;
						line-height: 1.4;
					"
				>
					${title}
				</div>
			</div>
		`,
		width: 1200,
		height: 630,
	}).toResponse({
		satori: {
			fonts: [
				{
					name: 'Innovator Grotesk',
					data: font,
					weight: 400,
					style: 'normal',
				},
			],
		},
	});
};
