import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '@/lib/utils/blog';
import { SITE } from '@/site.config';

/** Parents only: a series is one document under the parent's URL */
export async function GET(context: APIContext) {
	const posts = await getPosts();
	return rss({
		title: SITE.default.title,
		description: SITE.default.description,
		site: context.site!,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/blog/${post.id}`,
		})),
	});
}
