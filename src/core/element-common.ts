import { Context } from "./context.js";
import { Expression } from "./signals.js";

/**
 * Namespace URI for HTML elements.
 */
export const HTML = "http://www.w3.org/1999/xhtml";

/**
 * Namespace URI for SVG elements.
 */
export const SVG = "http://www.w3.org/2000/svg";

/**
 * Namespace URI for MathML elements.
 */
export const MATHML = "http://www.w3.org/1998/Math/MathML";

export type XMLNS = typeof HTML | typeof SVG | typeof MATHML;

/**
 * Context for setting the namespace URI for new elements.
 */
export const XMLNS = new Context<XMLNS>(HTML);

export type ClassValue = Expression<undefined | null | false | string | Record<string, Expression<boolean | undefined>> | ClassValue[]>;

type HyphenCase<T> = T extends `${infer A}${infer B}`
	? `${A extends Capitalize<A> ? "-" : ""}${Lowercase<A>}${HyphenCase<B>}`
	: T;

export type StyleMap = {
	[K in keyof CSSStyleDeclaration as HyphenCase<K>]?: Expression<undefined | null | string>;
} & {
	[K in string]?: Expression<undefined | null | string>;
};

export type StyleValue = Expression<undefined | StyleMap | StyleValue[]>;

export type EventListener<E extends Event> = (event: E) => void;

/**
 * Symbol for specifying a DOM node that is used as content.
 *
 * See {@link NodeTarget}.
 */
export const NODE = Symbol.for("rvx:node");

/**
 * If an object used as content has a {@link NODE} property, this node is inserted as content instead.
 */
export interface NodeTarget {
	[NODE]: Node;
}

/**
 * A function that is called immediately when the `ref` jsx attribute is initialized.
 */
export type RefFn<T> = (element: T) => void;

/**
 * Value for the `ref` jsx attribute.
 */
export type RefValue<T> = (RefFn<T>) | RefFn<T>[];

/**
 * Represents an object with jsx element attributes.
 */
export type Attributes<T extends Element> = {
	class?: ClassValue;
	style?: StyleValue;
	ref?: RefValue<T>;
} & {
	[K in keyof HTMLElementEventMap as `on:${K}`]?: EventListener<HTMLElementEventMap[K]> | EventArgs<HTMLElementEventMap[K]>;
} & {
	[K in `prop:${string}`]?: Expression<unknown>;
} & {
	[K in `attr:${string}`]?: Expression<unknown>;
} & {
	[K in string]?: Expression<unknown>;
};

/**
 * Type for specifying a jsx event listener with options.
 */
export type EventArgs<E extends Event> = [
	listener: EventListener<E>,
	options?: AddEventListenerOptions,
];

/**
 * Type used for mapping tag names to element types.
 */
export type TagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap;
