
/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	const tokens = Array(5).fill(0).map((_, i) => `token${i}`);
	return () => {
		ENV.provide(WINDOW, () => {
			e("div").class(tokens);
		});
	};
}
