import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface LightboxVariantsOptions {
	widths?: number[];
	quality?: number;
	format?: 'webp' | 'avif' | 'png' | 'jpeg';
	sizes?: string;
}

export interface LightboxVariantResult {
	lightboxSrc: string;
	lightboxSrcset: string;
	lightboxSizes: string;
	variantSources: { width: number; src: string }[];
}

/**
 * Genera src/srcset/sizes ottimizzati per uso in lightbox
 * Riutilizzabile in più componenti. Accetta un ImageMetadata (astro:assets) già risolto.
 */
export async function generateLightboxVariants(
	image: ImageMetadata,
	{
		widths = [800, 1200, 1600],
		quality = 80,
		format = 'webp',
		sizes = '(max-width: 1600px) 100vw, 1600px',
	}: LightboxVariantsOptions = {}
): Promise<LightboxVariantResult> {
	const variants = await Promise.all(
		widths.map((w) =>
			getImage({
				src: image,
				width: w,
				format,
				quality,
			})
		)
	);

	const lightboxSrc = variants[variants.length - 1].src;
	const lightboxSrcset = variants.map((v, i) => `${v.src} ${widths[i]}w`).join(', ');

	return {
		lightboxSrc,
		lightboxSrcset,
		lightboxSizes: sizes,
		variantSources: widths.map((w, i) => ({ width: widths[i], src: variants[i].src })),
	};
}
