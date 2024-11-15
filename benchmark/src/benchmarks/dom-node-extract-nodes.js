
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ Node, Range }) {
	return () => {
		const root = new Node();
		for (let i = -2; i < multiplier; i++) {
			root.appendChild(new Node());
		}
		const range = new Range();
		range.setStartBefore(root.firstChild.nextSibling);
		range.setEndAfter(root.lastChild.previousSibling);
		range.extractContents();
	};
}
