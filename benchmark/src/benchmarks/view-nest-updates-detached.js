
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ Nest, $ }) {
	return () => {
		const signal = $(0);
		const view = Nest({
			children: () => {
				const value = signal.value;
				return () => String(value);
			},
		});
		for (let i = 0; i < multiplier; i++) {
			signal.value++;
		}
		return view;
	};
}
