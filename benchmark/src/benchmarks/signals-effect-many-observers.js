
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ $, effect }) {
	return () => {
		const signal = $(0);
		for (let i = 0; i < multiplier; i++) {
			effect(() => signal.access());
		}
		signal.notify();
	};
}
