import type { Attributes, TagNameMap } from "../element-common.js";
import { createElement } from "./internals.js";

type NativeElement = Element;

export namespace JSX {
	export type IntrinsicElements = {
		[K in keyof TagNameMap]: Attributes<TagNameMap[K]>;
	} & {
		[K in string]: Attributes<NativeElement>;
	};

	export interface ElementChildrenAttribute {
		children: {};
	}

	export type Element = unknown;
	export type ElementClass = never;
}

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
