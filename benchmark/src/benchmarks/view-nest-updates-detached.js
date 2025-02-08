
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ nest, $ }) {
	return () => {
		const signal = $(0);
		const view = nest(signal, value => String(value));
		for (let i = 0; i < multiplier; i++) {
			signal.value++;
		}
		return view;
	};
}
