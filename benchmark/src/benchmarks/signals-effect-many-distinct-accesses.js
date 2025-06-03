
export const multiplier = 1000;

/** @param {import("rvx")} rvx */
export function create(rvx) {
	const { $ } = rvx;
	const effect = rvx.effect ?? rvx.watch;

	return () => {
		const signals = [];
		for (let i = 0; i < multiplier; i++) {
			signals.push($(i));
		}
		effect(() => {
			for (let i = 0; i < multiplier; i++) {
				signals[i].access();
			}
		});
		signals[Math.round(multiplier / 2)].notify();
	};
}
