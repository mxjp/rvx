
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ sig, watch }) {
	return () => {
		const signals = [];
		for (let i = 0; i < multiplier; i++) {
			signals.push(sig(i));
		}
		watch(() => {
			for (let i = 0; i < multiplier; i++) {
				signals[i].access();
			}
		}, () => {});
		signals[Math.round(multiplier / 2)].notify();
	};
}
