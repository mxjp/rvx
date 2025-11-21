import type { Attributes, TagNameMap } from "../element-common.js";
import { createElement } from "../internals/create-element.js";
import { Content } from "../types.js";

export { Fragment } from "./fragment.js";

type NativeElement = Element;

declare global {
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
}

export function jsx(type: any, props: any, ...children: any[]): Content {
	props ??= {};
	if (children.length > 0) {
		props.children ??= children;
	}
	if (typeof type === "function") {
		return type(props);
	}
	return createElement(type, props);
}
