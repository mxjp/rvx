import { TagNameMap } from "../core/element-common.js";
import { View, viewNodes } from "../core/view.js";

/**
 * The same as **querySelector**, but for {@link View views}.
 */
export function querySelector<K extends keyof TagNameMap>(view: View, selector: K): TagNameMap[K] | null;
export function querySelector<E extends Element = Element>(view: View, selector: string): E | null;
export function querySelector(view: View, selector: string): Element | null {
	for (const node of viewNodes(view)) {
		if (node.nodeType === 1) {
			if ((node as Element).matches(selector)) {
				return node as Element;
			}
			const elem = (node as Element).querySelector(selector);
			if (elem !== null) {
				return elem;
			}
		}
	}
	return null;
}

/**
 * The same as **querySelectorAll**, but for {@link View views}.
 */
export function querySelectorAll<K extends keyof TagNameMap>(view: View, selector: K): TagNameMap[K][];
export function querySelectorAll<E extends Element = Element>(view: View, selector: string): E[];
export function querySelectorAll(view: View, selector: string): Element[] {
	const elems: Element[] = [];
	for (const node of viewNodes(view)) {
		if (node.nodeType === 1) {
			if ((node as Element).matches(selector)) {
				elems.push(node as Element);
			}
			elems.push(...(node as Element).querySelectorAll(selector));
		}
	}
	return elems;
}
