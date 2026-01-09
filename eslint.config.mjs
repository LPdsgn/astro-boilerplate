import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
	// Ignore patterns (MUST be first)
	{
		ignores: [
			'dist/**',
			'.astro/**',
			'node_modules/**',
			'.vercel/**',
			'coverage/**',
			'pnpm-lock.yaml',
			'.prettierignore',
			'*.min.js',
			'**/*.md',
			'public/**',
			'postcss.config.cjs',
		],
	},

	// Global settings
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	},

	// Base configs
	js.configs.recommended, // JavaScript
	tseslint.configs.recommended, // TypeScript
	eslintConfigPrettier, // Prettier

	// Astro configurations
	astro.configs.recommended,
	astro.configs['jsx-a11y-recommended'],
	// Astro-specific rules
	{
		files: ['**/*.astro'],
		languageOptions: {
			parser: astro.parser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.astro'],
				sourceType: 'module',
				ecmaVersion: 'latest',
				project: './tsconfig.json',
			},
		},
		rules: {
			// Astro rules
			'astro/prefer-class-list-directive': 'warn',
			'astro/prefer-split-class-list': 'warn',
			'astro/no-set-html-directive': 'warn',
			'astro/jsx-a11y/iframe-has-title': 'warn',
			'@typescript-eslint/no-empty-object-type': 'off',
			// Disable React rules that don't apply to Astro
			'react/no-unknown-property': 'off',
			'react/jsx-key': 'off',
		},
	},

	// TypeScript files configuration
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
			},
		},
		rules: {
			'@typescript-eslint/no-require-imports': 'warn',
		},
	},

	// Custom rules for all source files
	{
		files: ['**/*.{js,mjs,cjs,ts,tsx,jsx,astro}'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/triple-slash-reference': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			// General rules
			'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
			'no-undef': 'off', // Handled by TypeScript
			'prefer-const': 'warn',
		},
	},

	// React-specific rules (only for React files)
	{
		...react.configs.flat.recommended,
		files: ['**/*.{jsx,tsx}'],
		rules: {
			'react/react-in-jsx-scope': 'off', // Not needed with React 17+
			'react/prop-types': 'off', // Using TypeScript
			'react/jsx-no-target-blank': 'warn', // Security best practice
		},
	},
]);
