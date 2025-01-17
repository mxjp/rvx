import { Context } from "./context.js";
import { ClassValue, EventListener, NODE, NodeTarget, StyleValue, TagNameMap, XMLNS } from "./element-common.js";
import { ENV } from "./env.js";
import { appendContent, setAttr, setClass, setStyle } from "./internals.js";
import { Expression, watch } from "./signals.js";

export class ElementBuilder<E extends Element> implements NodeTarget {
	#env = ENV.current;
	elem: E;

	get [NODE](): Node {
		return this.elem;
	}

	constructor(elem: E) {
		this.elem = elem;
	}

	on<K extends keyof HTMLElementEventMap>(name: K, listener: EventListener<HTMLElementEventMap[K]>, options?: AddEventListenerOptions): this;
	on<E extends Event>(name: string, listener: EventListener<E>, options?: AddEventListenerOptions): this;
	on(name: string, listener: EventListener<Event>, options?: AddEventListenerOptions): this {
		this.elem.addEventListener(name, Context.wrap(listener), options);
		return this;
	}

	style(value: StyleValue): Omit<this, "style"> {
		setStyle(this.elem, value);
		return this;
	}

	class(value: ClassValue): Omit<this, "class"> {
		setClass(this.elem, value);
		return this;
	}

	set(name: string, value: Expression<unknown>): this {
		setAttr(this.elem, name, value);
		return this;
	}

	prop<K extends keyof E>(name: K, value: Expression<E[K]>): this {
		watch(value, value => this.elem[name] = value);
		return this;
	}

	append(...content: unknown[]): this {
		appendContent(this.elem, content, this.#env);
		return this;
	}
}

/**
 * Create a new element builder.
 *
 * @param tagName The tag name.
 * @returns The builder.
 */
export function e<K extends keyof TagNameMap>(tagName: K): ElementBuilder<TagNameMap[K]>;
export function e<E extends Element>(tagName: string): ElementBuilder<E>;
export function e(tagName: string): ElementBuilder<Element> {
	return new ElementBuilder(ENV.current.document.createElementNS(XMLNS.current, tagName));
}
