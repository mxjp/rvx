const HtmlWebpackPlugin = require("html-webpack-plugin");
const { join } = require("node:path");

/** @returns {import("webpack").Configuration} */
module.exports = env => {
	const prod = env?.prod ?? false;
	const dist = join(__dirname, "dist");

	return {
		context: __dirname,
		mode: prod ? "production" : "development",
		entry: "./src/main.tsx",
		resolve: {
			extensions: [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"],
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: "ts-loader",
				},
			],
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: "./src/index.html",
				inject: "body",
				minify: { collapseWhitespace: prod },
			}),
		],
		output: {
			path: dist,
			filename: "[contenthash].js",
			publicPath: "/",
		},
	};
};
