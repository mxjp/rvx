import { Context } from "../context.js";
import { Attributes, ClassValue, EventArgs, EventListener, RefFn, StyleValue, TagNameMap, XMLNS } from "../element-common.js";
import { ENV } from "../env.js";
import { appendContent } from "../internals/append-content.js";
import { setAttr } from "../internals/set-attr.js";
import { setClass } from "../internals/set-class.js";
import { setStyle } from "../internals/set-style.js";
import { isolate } from "../isolate.js";
import { watch } from "../signals.js";
import { Content } from "../types.js";

/**
 * The jsx fragment component that returns it's children as is.
 */
export function Fragment(props: { children?: Content }): Content {
	return props.children;
}

/**
 * Create an rvx jsx element.
 *
 * @param tagName The tag name.
 * @param attrs The attributes to set.
 * @returns The element.
 */
export function createElement<K extends keyof TagNameMap>(tagName: K, attrs: Attributes<TagNameMap[K]>): TagNameMap[K];
export function createElement<E extends Element>(tagName: string, attrs: Attributes<E>): E;
export function createElement(tagName: string, attrs: Attributes<TagNameMap[keyof TagNameMap]>): Element {
	const env = ENV.current;
	const elem = env.document.createElementNS(XMLNS.current, tagName);
	applyElement<Element>(elem, attrs as Attributes<Element>);
	return elem;
}

/**
 * Set rvx jsx attributes.
 *
 * @param elem The element.
 * @param attrs The attributes to set.
 */
export function applyElement<E extends Element>(elem: E, attrs: Attributes<E>): void {
	const env = ENV.current;
	for (const name in attrs) {
		const value = attrs[name];
		if (value !== undefined) {
			if (name === "children") {
				appendContent(elem, value, env);
			} else if (name.startsWith("on:")) {
				let listener: EventListener<Event>;
				let options: AddEventListenerOptions | undefined;
				if (Array.isArray(value)) {
					listener = (value as EventArgs<Event>)[0];
					options = (value as EventArgs<Event>)[1];
				} else {
					listener = value as EventListener<Event>;
				}
				const wrapped = Context.wrap(listener);
				elem.addEventListener(name.slice(3), event => isolate(wrapped, event), options);
			} else if (name.startsWith("prop:")) {
				const prop = name.slice(5);
				watch(value, value => (elem as any)[prop] = value);
			} else if (name.startsWith("attr:")) {
				const attr = name.slice(5);
				setAttr(elem, attr, value);
			} else if (name === "ref") {
				if (Array.isArray(value)) {
					value.forEach(v => (v as RefFn<Element>)(elem));
				} else {
					(value as RefFn<Element>)(elem);
				}
			} else if (name === "style") {
				setStyle(elem, value as StyleValue);
			} else if (name === "class") {
				setClass(elem, value as ClassValue);
			} else {
				setAttr(elem, name, value);
			}
		}
	}
}
