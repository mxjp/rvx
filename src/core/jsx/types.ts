import { Attributes, TagNameMap } from "../element-common.js";

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
