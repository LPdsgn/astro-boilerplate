/**
 * Represents a Swup page visit object.
 * @interface VisitType
 */
type VisitType = {
	fragmentVisit: any;
	/** The previous page, about to leave */
	from: {
		/** The name of the route. */
		route?: string;
		/** The URL of the previous page */
		url: string;
		/** The hash of the previous page */
		hash?: string;
	};
	/** The next page, about to enter */
	to: {
		/** The name of the route. */
		route?: string;
		/** The URL of the next page */
		url: string;
		/** The hash of the next page */
		hash?: string;
		/** The HTML content of the next page */
		html: string;
		/** The parsed document of the next page, available during visit */
		document?: Document;
	};
	/** The content containers, about to be replaced */
	containers: string[];
};
