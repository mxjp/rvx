
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ sig, watch }) {
	return () => {
		const signal = sig(0);
		watch(() => {
			for (let i = 0; i < multiplier; i++) {
				signal.access();
			}
		}, () => {});
		signal.notify();
	};
}
