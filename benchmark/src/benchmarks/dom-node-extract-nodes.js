
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ RvxNode, RvxRange }) {
	return () => {
		const root = new RvxNode();
		for (let i = -2; i < multiplier; i++) {
			root.appendChild(new RvxNode());
		}
		const range = new RvxRange();
		range.setStartBefore(root.firstChild.nextSibling);
		range.setEndAfter(root.lastChild.previousSibling);
		range.extractContents();
	};
}
