
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ e, $ }) {
	return () => {
		const signal = $(42);
		e("div").set("title", signal);
		for (let i = 0; i < multiplier; i++) {
			signal.value = i;
		}
	};
}
