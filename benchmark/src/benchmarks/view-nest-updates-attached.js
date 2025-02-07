
export const multiplier = 100;

/** @param {import("rvx")} */
export function create({ render, Nest, $ }) {
	return () => {
		const signal = $(0);
		const view = Nest({
			watch: signal,
			children: value => String(value),
		});
		render(["a", view, "b"]);
		for (let i = 0; i < multiplier; i++) {
			signal.value++;
		}
		return view;
	};
}
