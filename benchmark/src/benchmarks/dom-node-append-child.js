
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ Node }) {
	return () => {
		const root = new Node();
		for (let i = 0; i < multiplier; i++) {
			root.appendChild(new Node());
		}
	};
}
