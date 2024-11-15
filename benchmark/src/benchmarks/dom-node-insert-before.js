
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ RvxNode }) {
	return () => {
		const root = new RvxNode();
		const ref = new RvxNode();
		root.appendChild(ref);
		for (let i = 0; i < multiplier; i++) {
			root.insertBefore(new RvxNode(), ref);
		}
	};
}
