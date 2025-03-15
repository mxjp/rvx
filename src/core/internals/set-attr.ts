import { Expression, watch } from "../signals.js";

export function setAttr(elem: Element, name: string, value: Expression<unknown>): void {
	watch(value, value => {
		if (value === null || value === undefined || value === false) {
			elem.removeAttribute(name);
		} else {
			elem.setAttribute(name, value === true ? "" : value as string);
		}
	});
}
