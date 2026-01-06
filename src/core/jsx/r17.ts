import type { Attributes, TagNameMap } from "../element-common.js";
import { Content } from "../types.js";
import { createElement } from "./common.js";

export { Fragment } from "./common.js";

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

export function jsx(type: any, props: any, key: any): Content {
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
