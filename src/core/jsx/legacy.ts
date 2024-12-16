import type { Attributes, TagNameMap } from "../element-common.js";
import { createElement } from "./internals.js";

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

export const Fragment = Symbol.for("rvx:jsx-fragment") as unknown as () => unknown;

const NO_PROPS = {};

export function jsx(type: any, props: any, ...children: any[]): unknown {
	if (type === Fragment) {
		return children;
	}
	if (typeof type === "function") {
		if (children.length > 0) {
			props.children = children;
		}
		return type(props ?? NO_PROPS);
	}
	return createElement(type, props ?? NO_PROPS, children);
}
