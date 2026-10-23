import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';
import { defineHastPlugin } from 'satteri';
import { plainText } from './hast-text';

// blog/<series>/<part>.md(x) — the parent index.md(x) is left alone
const SUBPOST = /\/blog\/[^/]+\/(?!index\.mdx?$)([^/]+)\.mdx?$/;

/**
 * Prefixes heading ids of subposts with the file name, so a series rendered as one
 * document has no duplicate anchors. Factory: Sätteri re-invokes it per document,
 * which gives every post a fresh slugger.
 */
export function headingNamespace() {
	const slugger = new GithubSlugger();
	return defineHastPlugin({
		name: 'heading-namespace',
		element: {
			filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
			visit(node, ctx) {
				const path = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '';
				const match = SUBPOST.exec(path);
				if (!match) return;
				ctx.setProperty(node, 'id', `${match[1]}-${slugger.slug(plainText(node))}`);
			},
		},
	});
}
