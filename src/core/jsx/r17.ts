import type { Attributes, TagNameMap } from "../element-common.js";
import { createElement } from "../internals/create-element.js";

export { Fragment } from "./fragment.js";

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

export function jsx(type: any, props: any, key: any): unknown {
	if (key !== undefined) {
		props.key = key;
	}
	if (typeof type === "function") {
		return type(props);
	}
	return createElement(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
