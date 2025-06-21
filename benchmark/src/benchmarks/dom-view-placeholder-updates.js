
const viewCount = 100;

export const multiplier = viewCount;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ $, render, nest, WINDOW, ENV }) {
	return () => {
		ENV.inject(WINDOW, () => {
			const signals = Array(viewCount).fill(0).map(() => $(false));
			const root = render(signals.map((s, i) => nest(s, visible => {
				return visible ? i : [];
			})));
			for (let i = 0; i < viewCount; i++) {
				signals[i].value = true;
			}
			return root;
		});
	};
}
