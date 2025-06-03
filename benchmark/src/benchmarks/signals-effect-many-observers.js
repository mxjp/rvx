
export const multiplier = 1000;

/** @param {import("rvx")} rvx */
export function create(rvx) {
	const { $ } = rvx;
	const effect = rvx.effect ?? rvx.watch;

	return () => {
		const signal = $(0);
		for (let i = 0; i < multiplier; i++) {
			effect(() => signal.access());
		}
		signal.notify();
	};
}
