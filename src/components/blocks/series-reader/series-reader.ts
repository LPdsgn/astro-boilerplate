import { updateHistoryRecord } from 'swup';
import { Scroll, init } from '@lib/classes';
import { hashId, normalizePath } from '@lib/utils';

let ac: AbortController | undefined;
// stop before the swap: the scroll listener would otherwise rewrite the URL of the incoming page
document.addEventListener('page:before-swap', () => ac?.abort());

init('Series reader', () => {
	ac?.abort();
	ac = new AbortController();
	const { signal } = ac;

	const articles = [...document.querySelectorAll<HTMLElement>('article[data-url]')];
	if (articles.length < 2) return;
	const crumb = document.querySelector<HTMLElement>('.c-breadcrumb_page');
	let lastUrl: string | undefined;

	const sync = (article: HTMLElement, hash = '') => {
		const { url, title } = article.dataset;
		if (!url) return;
		// keeps Swup's history state (source, url) coherent
		if (url + hash !== normalizePath(location.pathname) + location.hash)
			updateHistoryRecord(url + hash);
		if (title) document.title = title;
		if (crumb) crumb.textContent = article.querySelector('h1')?.textContent ?? crumb.textContent;
	};

	// Links to another member of the chain (with or without #hash) scroll in place.
	// Capture + stopPropagation: Swup's click delegate ignores defaultPrevented.
	// Plain #hash links are already handled by the `link:anchor` hook in app.ts.
	document.addEventListener(
		'click',
		(event) => {
			if (
				event.defaultPrevented ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			const link = (event.target as Element).closest?.('a[href]');
			if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download'))
				return;
			if (
				link.getAttribute('href')?.startsWith('#') ||
				link.origin !== location.origin ||
				link.search
			)
				return;
			const article = articles.find((a) => a.dataset.url === normalizePath(link.pathname));
			if (!article) return;
			const target = link.hash
				? (document.getElementById(hashId(link.hash)) ?? article)
				: article;
			event.preventDefault();
			event.stopPropagation();
			Scroll.scrollTo(target === articles[0] ? 0 : target, { immediate: true });
			sync(article, target === article ? '' : link.hash);
		},
		{ capture: true, signal }
	);

	const atBottom = () => {
		const max = document.documentElement.scrollHeight - innerHeight;
		return max > 0 && scrollY >= max - 2;
	};

	// the article crossing a band near the top of the viewport (or the last one at the bottom)
	const currentArticle = () => {
		if (atBottom()) return articles[articles.length - 1];
		const band = innerHeight * 0.2;
		return articles.find((article) => {
			const rect = article.getBoundingClientRect();
			return rect.top <= band && rect.bottom > band;
		});
	};

	const update = () => {
		const current = currentArticle();
		if (!current || current.dataset.url === lastUrl) return;
		lastUrl = current.dataset.url;
		const hash =
			location.hash &&
			document.getElementById(hashId(location.hash))?.closest('article[data-url]') === current
				? location.hash
				: '';
		sync(current, hash);
	};

	addEventListener('scroll', update, { passive: true, signal });
	update();
});
