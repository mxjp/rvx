export const startSampleSize = 200;

/** @param {import("rvx")} */
export function create({ Nest, render }) {
	return () => {
		render([
			document.createComment(""),
			Nest({
				children: () => {
					return () => [
						document.createComment(""),
						document.createComment(""),
					];
				},
			}),
			document.createComment(""),
		]);
	};
}
