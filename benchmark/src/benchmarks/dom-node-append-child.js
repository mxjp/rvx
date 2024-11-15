
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ RvxNode }) {
	return () => {
		const root = new RvxNode();
		for (let i = 0; i < multiplier; i++) {
			root.appendChild(new RvxNode());
		}
	};
}
