// Tokens Studio token type vocabulary (subset we emit).
export type TokenType =
	| 'color'
	| 'spacing'
	| 'sizing'
	| 'borderRadius'
	| 'number'
	| 'fontWeights'
	| 'fontFamilies'
	| 'lineHeights'
	| 'letterSpacing'
	| 'duration'
	| 'cubicBezier'
	| 'other';

export interface Token {
	value: string;
	type: TokenType;
}

export interface TokenTree {
	[key: string]: Token | TokenTree;
}

// Tokens Studio $themes entry, extended with $figmaCollection/$figmaMode hints.
export interface ThemeDefinition {
	id: string;
	name: string;
	selectedTokenSets: Record<string, 'source' | 'enabled' | 'disabled'>;
	$figmaCollection: 'Core' | 'Theme' | 'Responsive';
	$figmaMode: string;
}

export interface TokensStudioMetadata {
	version: string;
	source: string;
	tokenSetOrder: string[];
}

export interface TokensStudioFile {
	$metadata: TokensStudioMetadata;
	$themes: ThemeDefinition[];
	// Token sets live as sibling keys (e.g. "core", "theme/light", "responsive/mobile").
	// TypeScript can't express "all string keys other than $metadata and $themes" cleanly,
	// so we type the additional sets via an intersection at construction sites.
	[tokenSetKey: string]: TokensStudioMetadata | ThemeDefinition[] | TokenTree;
}

// Intermediate representation produced by parse-css.ts, consumed by emit-tokens-studio.ts.

export interface FluidModes {
	mobile: number;
	tablet: number;
	laptop: number;
	desktop: number;
}

export interface ColorPrimitive {
	path: string[]; // e.g. ['dark', '900'] or ['primary', '500']
	hex: string; // 6-digit lowercase hex, e.g. '#0f0f0f'
}

export interface SemanticColor {
	path: string[]; // e.g. ['background'] or ['sidebar', 'background']
	mode: 'light' | 'dark';
	hex: string;
}

export type FluidTokenType = 'spacing' | 'sizing' | 'borderRadius';

export interface FluidToken {
	path: string[]; // e.g. ['spacing', 'md']
	type: FluidTokenType;
	fluid: FluidModes; // px values
}

export interface ScalarToken {
	path: string[];
	type: TokenType;
	value: string;
}

export interface TypographyEntry {
	name: string; // e.g. 'title'
	fontSize?: FluidModes; // px
	lineHeight?: string;
	letterSpacing?: string;
	fontWeight?: string;
}

export interface ParsedTokens {
	primitives: ColorPrimitive[];
	semanticColors: SemanticColor[];
	fluidTokens: FluidToken[];
	scalarTokens: ScalarToken[];
	typography: TypographyEntry[];
}

export type ResolvedEntry =
	| { kind: 'color'; hex: string }
	| { kind: 'dimension'; value: string }
	| { kind: 'fluid'; fluid: FluidModes }
	| { kind: 'duration'; value: string }
	| { kind: 'cubicBezier'; value: string }
	| { kind: 'raw'; value: string };

export interface Resolver {
	resolve(value: string, opts?: { mode?: 'light' | 'dark' }): string | null;
	resolveFluid(value: string): FluidModes | null;
	getFont(varName: string): string | null;
}

// Snapshot returned by figma-plugin-code.ts snapshot reader.
export interface FigmaMode {
	modeId: string;
	name: string;
}

export interface FigmaVariable {
	id: string;
	name: string; // slash-separated; matches Figma convention
	resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
	valuesByMode: Record<string, unknown>;
}

export interface FigmaCollection {
	id: string;
	name: 'Core' | 'Theme' | 'Responsive';
	modes: FigmaMode[];
	variables: FigmaVariable[];
}

export interface FigmaSnapshot {
	collections: FigmaCollection[];
}

// SeedPlan — the diff between desired tokens.json and current Figma snapshot.
export type FigmaValueInput =
	| { type: 'COLOR'; r: number; g: number; b: number; a?: number }
	| { type: 'FLOAT'; value: number }
	| { type: 'STRING'; value: string }
	| { type: 'ALIAS_PLACEHOLDER'; targetCollection: 'Core'; targetVariableName: string };

export type SeedOp =
	| { kind: 'collection.create'; name: 'Core' | 'Theme' | 'Responsive'; modes: string[] }
	| { kind: 'collection.verify'; name: string }
	| { kind: 'mode.create'; collectionId: string; collectionName: string; modeName: string }
	| { kind: 'mode.rename'; collectionId: string; modeId: string; newName: string }
	| {
			kind: 'variable.create';
			collectionName: 'Core' | 'Theme' | 'Responsive';
			variableName: string;
			resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
			valuesByMode: Record<string, FigmaValueInput>;
	  }
	| {
			kind: 'variable.update';
			variableId: string;
			variableName: string;
			valuesByMode: Record<string, FigmaValueInput>;
	  }
	| { kind: 'variable.delete'; variableId: string; variableName: string }
	| {
			kind: 'alias.resolve';
			fromCollection: 'Theme';
			fromVariableName: string;
			modeName: 'light' | 'dark';
			toCollection: 'Core';
			toVariableName: string;
	  };

export interface SeedPlan {
	ops: SeedOp[];
	summary: {
		collections: { create: number; verify: number };
		modes: { create: number; rename: number };
		variables: { create: number; update: number; delete: number };
		aliases: { resolve: number };
	};
	orphans: string[]; // variable names in Figma not in tokens.json (format: "<Collection>:<name>")
}

export interface SeedOptions {
	prune: boolean;
	force: boolean;
}
