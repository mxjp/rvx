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
export const XMLNS = new Context<XMLNS>();

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
 * **This is experimental API.**
 */
export const NODE = Symbol.for("rvx:node");

/**
 * **This is experimental API.**
 */
export interface NodeTarget {
	[NODE]: Node;
}
