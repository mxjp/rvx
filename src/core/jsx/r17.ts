import { createElement } from "../element-create.js";

export * from "./types.js";

export const Fragment = Symbol.for("rvx:jsx-fragment");

export function jsx(type: any, props: any, key: any): unknown {
	if (type === Fragment) {
		return props.children;
	}
	if (key !== undefined) {
		props.key = key;
	}
	if (typeof type === "function") {
		return type(props);
	}
	const children = props.children;
	delete props.children;
	return createElement(type, props, children);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
