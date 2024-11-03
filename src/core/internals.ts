import { type ClassValue, NODE, NodeTarget, type StyleValue } from "./element-common.js";
import { teardown, type TeardownHook } from "./lifecycle.js";
import { Expression, get, watch } from "./signals.js";
import { View } from "./view.js";

/**
 * A stack where the last item may be an array which teardown hooks are captured in.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [];

export type Falsy = null | undefined | false | 0 | 0n | "";

export type TagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap;

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
export interface TeardownFrame {
	push(hook: TeardownHook): void;
}

/**
 * Internal utility to create placeholder comments.
 */
export function createPlaceholder(): Node {
	return document.createComment("g");
}

/**
 * Internal utility to create an arbitrary parent node.
 */
export function createParent(): Node {
	return document.createDocumentFragment();
}

/**
 * Internal utility to extract an inclusive range of nodes.
 */
export function extractRange(first: Node, last: Node): DocumentFragment {
	const r = new Range();
	r.setStartBefore(first);
	r.setEndAfter(last);
	return r.extractContents();
}

/**
 * Internal utility to call a function with a specific stack frame.
 */
export function useStack<T, R>(stack: T[], frame: T, fn: () => R): R {
	try {
		stack.push(frame);
		return fn();
	} finally {
		stack.pop();
	}
}

/**
 * Create a text node that displays the result of an expression.
 *
 * Null and undefined are displayed as an empty string.
 */
export function createText(expr: Expression<unknown>): Text {
	const text = document.createTextNode("");
	watch(expr, value => text.textContent = (value ?? "") as string);
	return text;
}

/**
 * Append content to a node.
 *
 * @param node The node.
 * @param content The content to append.
 */
export function appendContent(node: Node, content: unknown): void {
	if (content === null || content === undefined) {
		return;
	}
	if (Array.isArray(content)) {
		for (let i = 0; i < content.length; i++) {
			appendContent(node, content[i]);
		}
	} else if (content instanceof Node) {
		node.appendChild(content);
	} else if (content instanceof View) {
		node.appendChild(content.take());
	} else if (typeof content === "object" && NODE in content) {
		node.appendChild((content as NodeTarget)[NODE]);
	} else {
		node.appendChild(createText(content));
	}
}

export function setAttr(elem: Element, name: string, value: Expression<unknown>): void {
	watch(value, value => {
		if (value === null || value === undefined || value === false) {
			elem.removeAttribute(name);
		} else {
			elem.setAttribute(name, value === true ? "" : value as string);
		}
	});
}

class ClassBucket {
	entries: { t: string, c: number, a: boolean }[] = [];
	target: DOMTokenList;

	constructor(target: DOMTokenList) {
		this.target = target;
	}

	add(token: string): void {
		const entries = this.entries;
		for (let i = 0; i < entries.length; i++) {
			if (entries[i].t === token) {
				entries[i].c++;
				return;
			}
		}
		entries.push({ t: token, c: 1, a: false });
	}

	remove(token: string): void {
		const entries = this.entries;
		for (let i = 0; i < this.entries.length; i++) {
			if (entries[i].t === token) {
				entries[i].c--;
				return;
			}
		}
	}

	flush(): void {
		const add: string[] = [];
		const remove: string[] = [];
		this.entries = this.entries.filter(entry => {
			if (entry.c === 0) {
				remove.push(entry.t);
				return false;
			} else if (!entry.a) {
				add.push(entry.t);
				entry.a = true;
			}
			return true;
		});
		if (add.length > 0) {
			this.target.add(...add);
		}
		if (remove.length > 0) {
			this.target.remove(...remove);
		}
	}
}

function watchClass(value: ClassValue, bucket: ClassBucket, flush: boolean): void {
	watch(value, value => {
		if (typeof value === "string") {
			bucket.add(value);
			teardown(() => {
				bucket.remove(value);
			});
		} else if (value) {
			if (Array.isArray(value)) {
				for (let i = 0; i < value.length; i++) {
					watchClass(value[i], bucket, false);
				}
			} else {
				for (const token in value) {
					watch(value[token], enable => {
						if (enable) {
							bucket.add(token);
							teardown(() => {
								bucket.remove(token);
							});
						}
						if (flush) {
							bucket.flush();
						}
					});
				}
			}
		}
		if (flush) {
			bucket.flush();
		} else {
			flush = true;
		}
	});
}

export function setClass(elem: Element, value: ClassValue): void {
	watchClass(value, new ClassBucket(elem.classList), true);
}

type StyleHandler = (name: string, value: unknown) => void;

function watchStyle(value: StyleValue, handler: StyleHandler): void {
	watch(value, value => {
		if (Array.isArray(value)) {
			const overwrites: string[][] = [];
			for (let i = value.length - 1; i >= 0; i--) {
				const self: string[] = [];
				overwrites[i] = self;
				watchStyle(value[i], (name, value) => {
					if (!self.includes(name)) {
						self.push(name);
					}
					for (let o = i + 1; o < overwrites.length; o++) {
						if (overwrites[o].includes(name)) {
							return;
						}
					}
					handler(name, value);
				});
			}
		} else if (value) {
			for (const name in value) {
				watch(value[name]!, value => handler(name, value));
			}
		}
	});
}

export function setStyle(elem: Element, value: StyleValue): void {
	const style = (elem as HTMLElement).style;
	watchStyle(value, (name, value) => style.setProperty(name, value ? String(value) : null));
}

export const NOOP = (): void => {};
