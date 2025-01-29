import { Context } from "./context.js";
import { ClassValue, EventListener, NODE, NodeTarget, StyleValue, TagNameMap, XMLNS } from "./element-common.js";
import { ENV } from "./env.js";
import { appendContent, setAttr, setClass, setStyle } from "./internals.js";
import { Expression, watch } from "./signals.js";

export class ElementBuilder<E extends Element> implements NodeTarget {
	#env = ENV.current;

	/**
	 * The target element this builder is modifying.
	 */
	elem: E;

	get [NODE](): Node {
		return this.elem;
	}

	/**
	 * Create a new element builder for the specified element.
	 *
	 * For also creating an element, use the {@link e} shorthand.
	 *
	 * @param elem The element to modify.
	 */
	constructor(elem: E) {
		this.elem = elem;
	}

	/**
	 * Append an event listener.
	 *
	 * @param type The event type to listen for.
	 * @param listener The event listener function. The current context is available within this listener.
	 * @param options Optional add event listener options.
	 *
	 * @example
	 * ```tsx
	 * e("button").on("click", event => { ... })
	 *
	 * e("div").on("scroll", event => { ... }, { capture: true })
	 * ```
	 */
	on<K extends keyof HTMLElementEventMap>(type: K, listener: EventListener<HTMLElementEventMap[K]>, options?: AddEventListenerOptions): this;
	on<E extends Event>(type: string, listener: EventListener<E>, options?: AddEventListenerOptions): this;
	on(type: string, listener: EventListener<Event>, options?: AddEventListenerOptions): this {
		this.elem.addEventListener(type, Context.wrap(listener), options);
		return this;
	}

	/**
	 * Set element styles.
	 *
	 * @param value Any combination of arrays, objects and expressions.
	 * + Properties use the same casing as in css. E.g. `font-family`, not `fontFamily`.
	 * + Properties specified later take precedence over earlier properties.
	 *
	 * @example
	 * ```tsx
	 * e("div").style({ color: "red" })
	 *
	 * e("div").style([
	 *   {
	 *     "color": "red",
	 *     "font-size": "1rem",
	 *   },
	 *   () => ({ "color": () => "blue" }),
	 *   { "color": someSignal },
	 *   [
	 *     { "width": "42px" },
	 *   ],
	 * ])
	 * ```
	 */
	style(value: StyleValue): Omit<this, "style"> {
		setStyle(this.elem, value);
		return this;
	}

	/**
	 * Set element classes.
	 *
	 * @param value Any combination of class tokens, arrays and objects with boolean expressions to determine which classes are added. `undefined`, `null` and `false` is ignored.
	 *
	 * @example
	 * ```tsx
	 * e("div").class("example")
	 *
	 * e("div").class([
	 *   "foo",
	 *   () => "bar",
	 *   {
	 *     baz: true,
	 *     boo: () => false,
	 *   },
	 * ])
	 * ```
	 */
	class(value: ClassValue): Omit<this, "class"> {
		setClass(this.elem, value);
		return this;
	}

	/**
	 * Set an attribute.
	 *
	 * @param name The name.
	 * @param value An expression for the value.
	 *
	 * @example
	 * ```tsx
	 * e("img").set("src", someSignal).set("alt", "Example")
	 * ```
	 */
	set(name: string, value: Expression<unknown>): this {
		setAttr(this.elem, name, value);
		return this;
	}

	/**
	 * Set a prpoerty.
	 *
	 * @param name The name.
	 * @param value An expression for the value.
	 *
	 * @example
	 * ```tsx
	 * e("input").prop("value", someValue)
	 * ```
	 */
	prop<K extends keyof E>(name: K, value: Expression<E[K]>): this {
		watch(value, value => this.elem[name] = value);
		return this;
	}

	/**
	 * Append content.
	 *
	 * + Any expression will be rendered as text.
	 * + DOM nodes.
	 * + Views.
	 * + Arrays, jsx fragments & any combination of the above.
	 *
	 * @example
	 * ```tsx
	 * e("h1").append("Hello World!")
	 *
	 * e("div").append([
	 *   ["Hello World!"],
	 *   e("div"),
	 *   ...
	 * ])
	 * ```
	 */
	append(...content: unknown[]): this {
		appendContent(this.elem, content, this.#env);
		return this;
	}
}

/**
 * Create a new element builder.
 *
 * This uses the current {@link XMLNS} value to determine the namespace.
 *
 * @param tagName The tag name.
 * @returns The builder.
 *
 * @example
 * ```tsx
 * e("h1").append("Hello World!")
 *
 * XMLNS.inject(SVG, () => {
 *   return e("svg").set("viewbox", "0 0 ...")
 * })
 * ```
 */
export function e<K extends keyof TagNameMap>(tagName: K): ElementBuilder<TagNameMap[K]>;
export function e<E extends Element>(tagName: string): ElementBuilder<E>;
export function e(tagName: string): ElementBuilder<Element> {
	return new ElementBuilder(ENV.current.document.createElementNS(XMLNS.current, tagName));
}
