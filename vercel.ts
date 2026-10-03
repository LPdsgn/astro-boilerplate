import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
	buildCommand: 'pnpm build',
	devCommand: 'pnpm dev',
	installCommand: 'pnpm install',
	framework: 'astro',
	outputDirectory: 'dist',
	cleanUrls: true,
	headers: [
		{
			source: '/_assets/(.*)',
			headers: [{ key: 'Cache-Control', value: 'public, max-age=0, immutable' }],
		},
		{
			source: '/(.*).woff2',
			headers: [{ key: 'Cache-Control', value: 'public, max-age=0, immutable' }],
		},
		{
			source: '/(.*).webp',
			headers: [
				{ key: 'Cache-Control', value: 'public, max-age=0, stale-while-revalidate=86400' },
			],
		},
	],
};
