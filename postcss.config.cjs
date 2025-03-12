module.exports = {
	plugins: [
		require("postcss-nested"),
		require("postcss-utopia")({
			minWidth: 360, // Default minimum viewport
			maxWidth: 1536, // Default maximum viewport
		}),
		require("autoprefixer"),
		require("cssnano"),
	],
};
