
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ Node }) {
	return () => {
		const root = new Node();
		const ref = new Node();
		root.appendChild(ref);
		for (let i = 0; i < multiplier; i++) {
			root.insertBefore(new Node(), ref);
		}
	};
}
