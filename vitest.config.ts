import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		include: ['scripts/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'node',
	},
});
