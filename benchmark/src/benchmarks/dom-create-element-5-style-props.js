
/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	const props = {};
	for (let i = 0; i < 5; i++) {
		props[`value${i}`] = String(i);
	}
	return () => {
		ENV.provide(WINDOW, () => {
			e("div").style(props);
		});
	};
}
