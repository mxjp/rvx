
/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	const props = {};
	for (let i = 0; i < 15; i++) {
		props[`value${i}`] = String(i);
	}
	return () => {
		ENV.inject(WINDOW, () => {
			e("div").style(props);
		});
	};
}
