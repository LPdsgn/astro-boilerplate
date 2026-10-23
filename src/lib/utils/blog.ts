/**
 * Blog queries (server-only: imports `astro:content`, hence not in the utils barrel).
 * A series is a folder: `blog/<series>/index.md` is the parent, `blog/<series>/<part>.md`
 * are its subposts, ordered by `order` then date. Only one nesting level is supported.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { isSubpost } from './string';

export type Post = CollectionEntry<'blog'>;

/** Published parents, newest first */
export async function getPosts(): Promise<Post[]> {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts
		.filter((post) => !isSubpost(post.id))
		.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Published subposts grouped by series id */
export async function getSubposts(): Promise<Map<string, Post[]>> {
	const posts = await getCollection(
		'blog',
		({ id, data }) => !data.draft && id.split('/').length === 2
	);
	posts.sort(
		(a, b) =>
			(a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
			a.data.date.getTime() - b.data.date.getTime()
	);
	return Map.groupBy(posts, (post) => post.id.split('/')[0]);
}

/** Tags → parents (a series contributes the tags of every part), most used first */
export async function getTags(): Promise<Map<string, Post[]>> {
	const posts = await getPosts();
	const series = await getSubposts();
	const tags = new Map<string, Post[]>();
	for (const post of posts) {
		const chain = [post, ...(series.get(post.id) ?? [])];
		for (const tag of new Set(chain.flatMap((entry) => entry.data.tags ?? []))) {
			const tagged = tags.get(tag);
			if (tagged) tagged.push(post);
			else tags.set(tag, [post]);
		}
	}
	return new Map(
		[...tags].sort(
			([a, postsA], [b, postsB]) => postsB.length - postsA.length || a.localeCompare(b)
		)
	);
}
