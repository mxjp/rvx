
export const multiplier = 10;

/** @param {import("rvx")} */
export function create({ Nest, sig }) {
	return () => {
		const signal = sig(0);
		const view = Nest({
			children: () => {
				const value = signal.value;
				return () => [String(value), ""];
			},
		});
		for (let i = 0; i < multiplier; i++) {
			signal.value++;
		}
		return view;
	};
}
