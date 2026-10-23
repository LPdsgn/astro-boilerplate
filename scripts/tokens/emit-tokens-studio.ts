import type {
	ColorPrimitive,
	FluidModes,
	ParsedTokens,
	ThemeDefinition,
	Token,
	TokenTree,
	TokensStudioFile,
} from './schema';

const SCHEMA_VERSION = '1.0.0';
const SOURCE_DESCRIPTOR = 'astro-boilerplate/src/styles/{theme,tailwind,typography}.css';

const TOKEN_SET_ORDER = [
	'core',
	'theme/light',
	'theme/dark',
	'responsive/mobile',
	'responsive/tablet',
	'responsive/laptop',
	'responsive/desktop',
] as const;

const THEMES: ThemeDefinition[] = [
	{
		id: 'theme-light',
		name: 'Light',
		selectedTokenSets: { core: 'source', 'theme/light': 'enabled' },
		$figmaCollection: 'Theme',
		$figmaMode: 'light',
	},
	{
		id: 'theme-dark',
		name: 'Dark',
		selectedTokenSets: { core: 'source', 'theme/dark': 'enabled' },
		$figmaCollection: 'Theme',
		$figmaMode: 'dark',
	},
	{
		id: 'responsive-mobile',
		name: 'Mobile',
		selectedTokenSets: { core: 'source', 'responsive/mobile': 'enabled' },
		$figmaCollection: 'Responsive',
		$figmaMode: 'mobile',
	},
	{
		id: 'responsive-tablet',
		name: 'Tablet',
		selectedTokenSets: { core: 'source', 'responsive/tablet': 'enabled' },
		$figmaCollection: 'Responsive',
		$figmaMode: 'tablet',
	},
	{
		id: 'responsive-laptop',
		name: 'Laptop',
		selectedTokenSets: { core: 'source', 'responsive/laptop': 'enabled' },
		$figmaCollection: 'Responsive',
		$figmaMode: 'laptop',
	},
	{
		id: 'responsive-desktop',
		name: 'Desktop',
		selectedTokenSets: { core: 'source', 'responsive/desktop': 'enabled' },
		$figmaCollection: 'Responsive',
		$figmaMode: 'desktop',
	},
];

const MODES: ReadonlyArray<keyof FluidModes> = ['mobile', 'tablet', 'laptop', 'desktop'];

function setNested(tree: TokenTree, path: string[], token: Token): void {
	let node: TokenTree = tree;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		const existing = node[key];
		if (existing && 'value' in existing && 'type' in existing) {
			throw new Error(
				`Path collision at "${path.slice(0, i + 1).join('.')}": expected branch, got token leaf`
			);
		}
		if (!existing) node[key] = {} as TokenTree;
		node = node[key] as TokenTree;
	}
	node[path[path.length - 1]] = token;
}

function findPrimitiveByHex(primitives: ColorPrimitive[], hex: string): ColorPrimitive | null {
	for (const p of primitives) if (p.hex === hex) return p;
	return null;
}

function aliasRef(primitivePath: string[]): string {
	return `{core.${primitivePath.join('.')}}`;
}

export function emitTokensStudio(parsed: ParsedTokens): string {
	const primitives = [...parsed.primitives];
	const core: TokenTree = {};
	const themeLight: TokenTree = {};
	const themeDark: TokenTree = {};
	const responsive: Record<string, TokenTree> = {
		mobile: {},
		tablet: {},
		laptop: {},
		desktop: {},
	};

	const writePrimitive = (p: ColorPrimitive) => {
		setNested(core, p.path, { value: p.hex, type: 'color' });
	};
	for (const p of primitives) writePrimitive(p);

	for (const s of parsed.scalarTokens) {
		setNested(core, s.path, { value: s.value, type: s.type });
	}

	for (const sc of parsed.semanticColors) {
		let primitive = findPrimitiveByHex(primitives, sc.hex);
		if (!primitive) {
			const syntheticPath = ['color', `${sc.path.join('-')}-${sc.mode}`];
			primitive = { path: syntheticPath, hex: sc.hex };
			primitives.push(primitive);
			writePrimitive(primitive);
		}
		const target = sc.mode === 'light' ? themeLight : themeDark;
		setNested(target, sc.path, {
			value: aliasRef(primitive.path),
			type: 'color',
		});
	}

	for (const ft of parsed.fluidTokens) {
		for (const mode of MODES) {
			setNested(responsive[mode], ft.path, {
				value: `${ft.fluid[mode]}px`,
				type: ft.type,
			});
		}
	}

	for (const ty of parsed.typography) {
		for (const mode of MODES) {
			const base = ['type', ty.name];
			if (ty.fontSize) {
				setNested(responsive[mode], [...base, 'font-size'], {
					value: `${ty.fontSize[mode]}px`,
					type: 'sizing',
				});
			}
			if (ty.lineHeight !== undefined) {
				setNested(responsive[mode], [...base, 'line-height'], {
					value: ty.lineHeight,
					type: 'lineHeights',
				});
			}
			if (ty.letterSpacing !== undefined) {
				setNested(responsive[mode], [...base, 'letter-spacing'], {
					value: ty.letterSpacing,
					type: 'letterSpacing',
				});
			}
			if (ty.fontWeight !== undefined) {
				setNested(responsive[mode], [...base, 'font-weight'], {
					value: ty.fontWeight,
					type: 'fontWeights',
				});
			}
		}
	}

	const out: TokensStudioFile = {
		$metadata: {
			version: SCHEMA_VERSION,
			source: SOURCE_DESCRIPTOR,
			tokenSetOrder: [...TOKEN_SET_ORDER],
		},
		$themes: THEMES,
		core,
		'theme/light': themeLight,
		'theme/dark': themeDark,
		'responsive/mobile': responsive.mobile,
		'responsive/tablet': responsive.tablet,
		'responsive/laptop': responsive.laptop,
		'responsive/desktop': responsive.desktop,
	};

	return canonicalize(out);
}

function canonicalize(obj: TokensStudioFile): string {
	const orderedTopLevel: Record<string, unknown> = {
		$metadata: obj.$metadata,
		$themes: obj.$themes,
	};
	for (const setKey of obj.$metadata.tokenSetOrder) {
		orderedTopLevel[setKey] = sortKeysDeep(obj[setKey] as TokenTree);
	}
	return JSON.stringify(orderedTopLevel, null, '\t') + '\n';
}

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(sortKeysDeep);
	const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
		a.localeCompare(b)
	);
	const out: Record<string, unknown> = {};
	for (const [k, v] of entries) out[k] = sortKeysDeep(v);
	return out;
}
