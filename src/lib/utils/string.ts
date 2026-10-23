const toDash = (str: string) =>
	str
		.split(/(?=[A-Z])/)
		.join('-')
		.toLowerCase();

export { toDash };

/** Blog series: a subpost id is `<series>/<part>` */
const isSubpost = (id: string) => id.includes('/');

const subpostSlug = (id: string) => id.split('/')[1];

/** Decoded pathname without trailing slashes (safe on malformed encodings) */
const normalizePath = (pathname: string) => {
	try {
		return decodeURIComponent(pathname).replace(/\/+$/, '');
	} catch {
		return pathname.replace(/\/+$/, '');
	}
};

/** `#foo%20bar` → `foo bar` */
const hashId = (hash: string) => decodeURIComponent(hash.slice(1));

export { isSubpost, subpostSlug, normalizePath, hashId };
