import { init } from '@lib/classes';
import { hashId } from '@lib/utils';

/**
 * Scrollspy for the table of contents (port of astro-erudite v2, minus progress ring):
 * every block of prose is mapped to the heading that precedes it, so a range of
 * headings can be active at once; subpost groups open when they become active
 * and never close behind you; the list auto-centers on the active run.
 */
let ac: AbortController | undefined;
document.addEventListener('page:before-swap', () => ac?.abort());

init('Table of contents', () => {
	ac?.abort();
	ac = new AbortController();
	const { signal } = ac;

	const nav = document.querySelector<HTMLElement>('[data-slot="toc"]');
	if (!nav) return;

	// link ↔ target; duplicate ids (a series is one document) resolve by occurrence
	const seen = new Map<string, number>();
	const links = new Map<Element, HTMLAnchorElement>();
	for (const a of nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
		const id = hashId(a.hash);
		const nth = seen.get(id) ?? 0;
		seen.set(id, nth + 1);
		const target = document.querySelectorAll(`[id="${CSS.escape(id)}"]`)[nth];
		if (target) links.set(target, a);
	}
	const articles = document.querySelectorAll('article[data-url]');
	const list = nav.querySelector<HTMLElement>('.c-toc_list');
	const currentLabel = nav.querySelector('.c-toc_current');
	const toggle = nav.querySelector<HTMLInputElement>('input');
	if (articles.length === 0 || !list || links.size === 0) return;

	const fallback = currentLabel?.textContent ?? '';

	const groups = [...nav.querySelectorAll<HTMLDetailsElement>('.c-toc_group details')].map(
		(details) => ({
			details,
			active: details.open,
			anchors: [...details.querySelectorAll<HTMLAnchorElement>("a[href^='#']")],
		})
	);

	// block → heading target: the article itself, or the prose block holding the heading
	const blockOf = new Map<Element, Element>();
	for (const target of links.keys()) {
		const block = target.closest('.sw-prose > *, article[data-url]');
		if (block && !blockOf.has(block)) blockOf.set(block, target);
	}

	// every observed block → the heading that precedes it
	const sectionOf = new Map<Element, Element>();
	for (const article of articles) {
		let current = blockOf.get(article);
		for (const child of article.children) {
			const prose = child.matches('.sw-prose')
				? child
				: child.querySelector(':scope > .sw-prose');
			if (prose) {
				for (const block of prose.children) {
					current = blockOf.get(block) ?? current;
					if (current) sectionOf.set(block, current);
				}
			} else if (current) sectionOf.set(child, current);
		}
	}

	const visible = new Set<Element>();
	let prevActive = new Set<Element>();

	const center = () => {
		const run = [...list.querySelectorAll<HTMLAnchorElement>("a[data-state='active']")];
		const first = run[0];
		const last = run[run.length - 1];
		if (!first || !run.every((a) => a.checkVisibility())) return;
		const area = list.getBoundingClientRect();
		const runCenter =
			(first.getBoundingClientRect().top + last.getBoundingClientRect().bottom) / 2;
		list.scrollTo({ top: list.scrollTop + runCenter - (area.top + area.height / 2) });
	};

	toggle?.addEventListener('change', () => toggle.checked && center(), { signal });
	list.addEventListener(
		'click',
		(event) => {
			if (toggle && (event.target as Element).closest?.('a')) toggle.checked = false;
		},
		{ signal }
	);

	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) visible.add(entry.target);
			else visible.delete(entry.target);
		}

		const activeTargets = new Set<Element>();
		for (const block of visible) {
			const target = sectionOf.get(block);
			if (target) activeTargets.add(target);
		}

		let firstActive: HTMLAnchorElement | undefined;
		for (const [target, link] of links) {
			const on = activeTargets.has(target);
			link.setAttribute('data-state', on ? 'active' : 'inactive');
			link.removeAttribute('aria-current');
			if (on) firstActive ??= link;
		}
		firstActive?.setAttribute('aria-current', 'location');

		if (currentLabel) {
			const label = firstActive?.textContent?.trim() || fallback;
			if (currentLabel.textContent !== label) currentLabel.textContent = label;
		}

		for (const group of groups) {
			const active = group.anchors.some((a) => a.dataset.state === 'active');
			if (active !== group.active) {
				group.active = active;
				if (active) group.details.open = true;
			}
		}

		let grew = false;
		for (const target of activeTargets) {
			if (!prevActive.has(target)) {
				grew = true;
				break;
			}
		}
		prevActive = activeTargets;
		if (grew) center();
	});
	signal.addEventListener('abort', () => observer.disconnect());

	for (const block of sectionOf.keys()) observer.observe(block);
});
