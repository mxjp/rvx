
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ Context }) {
	const ctx = new Context();

	return () => {
		for (let i = 0; i < multiplier; i++) {
			ctx.inject(42, () => {
				const _ =ctx.current;
			});
		}
	};
}
