import { Context } from "../context.js";
import { Attributes, ClassValue, EventArgs, EventListener, RefFn, StyleValue, TagNameMap, XMLNS } from "../element-common.js";
import { ENV } from "../env.js";
import { watch } from "../signals.js";
import { appendContent } from "./append-content.js";
import { setAttr } from "./set-attr.js";
import { setClass } from "./set-class.js";
import { setStyle } from "./set-style.js";

/**
 * Internal function to create a jsx element.
 *
 * @param tagName The tag name.
 * @param attrs The attributes to set with optional children.
 * @returns The element.
 */
export function createElement<K extends keyof TagNameMap>(tagName: K, attrs: Attributes<TagNameMap[K]>): TagNameMap[K];
export function createElement<E extends Element>(tagName: string, attrs: Attributes<E>): E;
export function createElement(tagName: string, attrs: Attributes<TagNameMap[keyof TagNameMap]>): Element {
	const env = ENV.current;
	const elem = env.document.createElementNS(XMLNS.current, tagName);
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
				elem.addEventListener(name.slice(3), Context.wrap(listener), options);
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
	return elem;
}
