
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ Context }) {
	const a = new Context();
	const b = new Context();
	return () => {
		Context.inject([
			a.with(1),
			b.with(2),
		], () => {
			for (let i = 0; i < multiplier; i++) {
				Context.wrap(() => {})();
			}
		});
	};
}
