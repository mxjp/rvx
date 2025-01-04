
/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	return () => {
		ENV.inject(WINDOW, () => {
			const elem = e("div");
			for (let i = 0; i < 5; i++) {
				elem.set(`value-${i}`, String(i));
			}
		});
	};
}
