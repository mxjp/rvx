import { Context } from "./context.js";
import { ClassValue, EventListener, HTML, StyleValue, XMLNS } from "./element-common.js";
import { appendContent, setAttr, setClass, setStyle, TagNameMap } from "./internals.js";
import { Expression, watch } from "./signals.js";

export type RefFn<T> = (element: T) => void;
export type RefValue<T> = (RefFn<T>) | RefFn<T>[];

/**
 * Represents an object with element attributes.
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

export type EventArgs<E extends Event> = [
	listener: EventListener<E>,
	options?: AddEventListenerOptions,
];

/**
 * Create an element.
 *
 * @param tagName The tag name.
 * @param attrs The attributes to set.
 * @param content The content to append.
 * @returns The element.
 */
export function createElement<K extends keyof TagNameMap>(tagName: K, attrs: Attributes<TagNameMap[K]>, content: unknown): TagNameMap[K];
export function createElement<E extends Element>(tagName: string, attrs: Attributes<E>, content: unknown): E;
export function createElement(tagName: string, attrs: Attributes<TagNameMap[keyof TagNameMap]>, content: unknown): Element {
	const elem = document.createElementNS(XMLNS.current ?? HTML, tagName);
	for (const name in attrs) {
		const value = attrs[name];
		if (value !== undefined) {
			if (name.startsWith("on:")) {
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
	appendContent(elem, content);
	return elem;
}
