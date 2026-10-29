
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ $, watch, dispatch }) {
	return () => {
		const signal = $(0);
		for (let i = 0; i < multiplier; i++) {
			watch(() => signal.access(), () => {});
		}
		signal.value++;
		dispatch();
	};
}
