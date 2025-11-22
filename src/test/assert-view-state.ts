import { ENV } from "../core/env.js";
import { UninitView, View } from "../core/view.js";

/**
 * Assert that the specified view is in a valid state.
 *
 * This can be used in development to assert the correctness of custom view implementations.
 *
 * ```tsx
 * import { View } from "rvx";
 * import { assertViewState } from "rvx/test";
 *
 * new View((setBoundary, self) => {
 *   ...
 *   assertViewState(self);
 *   ...
 * });
 * ```
 */
export function assertViewState(view: UninitView): void {
	if (!(view instanceof View)) {
		throw new Error("view is not a View");
	}
	const env = ENV.current;
	if (!(view.first instanceof env.Node)) {
		throw new Error("view.first is not a Node");
	}
	if (!(view.last instanceof env.Node)) {
		throw new Error("view.last is not a Node");
	}
	if (view.first !== view.last) {
		const parent = view.first.parentNode;
		if (!(parent instanceof env.Node)) {
			throw new Error("view.first.parent is not a Node");
		}
		let node = view.first.nextSibling;
		nodes: for (;;) {
			if (node === null) {
				throw new Error("view is unterminated");
			}
			if (!(node instanceof env.Node)) {
				throw new Error("view contains non-Node");
			}
			if (node === view.last) {
				break nodes;
			}
			node = node.nextSibling;
		}
	}
}
