import { HTML, MATHML, SVG } from "../core/element-common.js";

const NODE_LENGTH = Symbol("length");
const NODE_APPEND_HTML_TO = Symbol("appendHtmlTo");
const NODE_EXTRACT_RANGE = Symbol("extractRange");

class NodeListIterator implements Iterator<Node> {
	#current: Node | null;

	constructor(node: Node) {
		this.#current = node.firstChild;
	}

	next(): IteratorResult<Node, any> {
		const current = this.#current;
		if (current === null) {
			return { value: null, done: true };
		}
		this.#current = current.nextSibling;
		return { value: current, done: false };
	}
}

export class NodeList {
	#node: Node;

	constructor(node: Node) {
		this.#node = node;
	}

	get length(): number {
		return this.#node[NODE_LENGTH]();
	}

	forEach(cb: (node: Node, index: number, list: NodeList) => void, thisArg?: unknown): void {
		let index = 0;
		let node = this.#node.firstChild;
		while (node !== null) {
			cb.call(thisArg, node, index, this);
			node = node.nextSibling;
			index++;
		}
	}

	[Symbol.iterator](): Iterator<Node> {
		return new NodeListIterator(this.#node);
	}

	values(): Iterator<Node> {
		return new NodeListIterator(this.#node);
	}
}

export function htmlEscapeAppendTo(html: string, data: string) {
	// TODO: Optimize:
	return html + data.replace(/["'<>&]/g, c => {
		switch (c) {
			case "\"": return "&#34;";
			case "'": return "&#39;";
			case "<": return "&lt;";
			case ">": return "&gt;";
			default: return "&amp;";
		}
	});
}

export class NoopEvent {}

export class NoopEventTarget {
	addEventListener(): void {
		// noop
	}

	removeEventListener(): void {
		// noop
	}

	dispatchEvent(): void {
		throw new Error("dispatching events is not supported");
	}
}

export class Document extends NoopEventTarget {
	get body(): Element | null {
		// noop
		return null;
	}

	get activeElement(): Element | null {
		// noop
		return null;
	}

	createTextNode(data: string) {
		return new Text(data);
	}

	createComment(data: string) {
		return new NoopComment(data);
	}

	createDocumentFragment() {
		return new DocumentFragment();
	}

	createElementNS(namespaceURI: string, tagName: string) {
		return new Element(namespaceURI, tagName);
	}

	createElement(tagName: string) {
		return new Element(HTML, tagName);
	}
}

export class Node extends NoopEventTarget {
	#parent: Node | null = null;
	#first: Node | null = null;
	#last: Node | null = null;
	#prev: Node | null = null;
	#next: Node | null = null;
	#length = 0;

	#childNodes: NodeList | null = null;

	get parentNode(): Node | null {
		return this.#parent;
	}

	get firstChild(): Node | null {
		return this.#first;
	}

	get lastChild(): Node | null {
		return this.#last;
	}

	get previousSibling(): Node | null {
		return this.#prev;
	}

	get nextSibling(): Node | null {
		return this.#next;
	}

	get childNodes(): NodeList {
		if (this.#childNodes === null) {
			this.#childNodes = new NodeList(this);
		}
		return this.#childNodes;
	}

	[NODE_LENGTH](): number {
		return this.#length;
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		let child = this.firstChild;
		while (child !== null) {
			html = child[NODE_APPEND_HTML_TO](html);
			child = child.nextSibling;
		}
		return html;
	}

	static [NODE_EXTRACT_RANGE](start: Node | null, end: Node | null): DocumentFragment {
		if (start === null || end === null) {
			throw new Error("invalid range");
		}
		const parent = start.#parent;
		if (parent === null || parent !== end.#parent) {
			throw new Error("invalid range");
		}
		const fragment = new DocumentFragment();
		let child = start;
		let length = 0;
		updateParents: for (;;) {
			child.#parent = fragment;
			length++;
			if (child === end) {
				break updateParents;
			}
			const next = child.#next;
			if (next === null) {
				revertParents: for (;;) {
					child.#parent = parent;
					if (child === start) {
						break revertParents;
					}
					child = child.#prev!;
				}
				throw new Error("unterminated range");
			}
			child = next;
		}
		const prev = start.#prev;
		const next = end.#next;
		if (prev === null) {
			parent.#first = next;
		} else {
			prev.#next = next;
		}
		if (next === null) {
			parent.#last = prev;
		} else {
			next.#prev = prev;
		}
		parent.#length -= length;
		start.#prev = null;
		end.#next = null;
		fragment.#first = start;
		fragment.#last = end;
		fragment.#length = length;
		return fragment;
	}

	contains(node: Node | null) {
		if (node === null) {
			return false;
		}
		do {
			if (node === this) {
				return true;
			}
			node = node.#parent;
		} while (node !== null);
		return false;
	}

	hasChildNodes(): boolean {
		return this.#length > 0;
	}

	removeChild(node: Node): Node {
		if (node.#parent !== this) {
			throw new Error("node is not a child of this node");
		}
		const prev = node.#prev;
		const next = node.#next;
		if (prev === null) {
			this.#first = next;
		} else {
			prev.#next = next;
		}
		if (next === null) {
			this.#last = prev;
		} else {
			next.#prev = prev;
		}
		node.#prev = null;
		node.#next = null;
		node.#parent = null;
		this.#length--;
		return node;
	}

	appendChild(node: Node): Node {
		if (node.nodeType === 11) {
			if (node.#length === 0) {
				return node;
			}
			const prev = this.#last;
			const first = node.#first!;
			if (prev === null) {
				this.#first = first;
			} else {
				prev.#next = first;
			}
			first.#prev = prev;
			this.#last = node.#last;
			this.#length += node.#length;
			let child: Node | null = first;
			while (child !== null) {
				child.#parent = this;
				child = child.#next;
			}
			node.#first = null;
			node.#last = null;
			node.#length = 0;
			return node;
		}
		node.#parent?.removeChild(node);
		const prev = this.#last;
		if (prev === null) {
			this.#first = node;
		} else {
			prev.#next = node;
		}
		node.#prev = prev;
		node.#parent = this;
		this.#last = node;
		this.#length++;
		return node;
	}

	insertBefore(node: Node, ref: Node): Node {
		if (ref.#parent !== this) {
			throw new Error("ref must be a child of this node");
		}
		if (node.nodeType === 11) {
			if (node.#length === 0) {
				return node;
			}
			const prev = ref.#prev;
			const first = node.#first!;
			const last = node.#last!;
			if (prev === null) {
				this.#first = first;
			} else {
				prev.#next = first;
			}
			first.#prev = prev;
			last.#next = ref;
			ref.#prev = last;
			this.#length += node.#length;
			let child: Node | null = first;
			while (child !== null) {
				child.#parent = this;
				child = child.#next;
			}
			node.#first = null;
			node.#last = null;
			node.#length = 0;
			return node;
		}
		node.#parent?.removeChild(node);
		const prev = ref.#prev;
		if (prev === null) {
			this.#first = node;
		} else {
			prev.#next = node;
		}
		ref.#prev = node;
		node.#parent = this;
		node.#prev = prev;
		node.#next = ref;
		this.#length++;
		return node;
	}

	replaceChild(node: Node, ref: Node): Node {
		if (ref.#parent !== this) {
			throw new Error("ref must be a child of this node");
		}
		if (node.nodeType === 11) {
			if (node.#length === 0) {
				const prev = ref.#prev;
				const next = ref.#next;
				if (prev === null) {
					this.#first = next;
				} else {
					prev.#next = next;
				}
				if (next === null) {
					this.#last = prev;
				} else {
					next.#prev = prev;
				}
				ref.#parent = null;
				ref.#prev = null;
				ref.#next = null;
				this.#length--;
			} else {
				const first = node.#first!;
				const last = node.#last!;
				const prev = ref.#prev;
				const next = ref.#next;
				if (prev === null) {
					this.#first = first;
				} else {
					prev.#next = first;
					first.#prev = prev;
				}
				if (next === null) {
					this.#last = last;
				} else {
					next.#prev = last;
					last.#next = next;
				}
				ref.#parent = null;
				ref.#prev = null;
				ref.#next = null;
				this.#length = this.#length - 1 + node.#length;
				node.#first = null;
				node.#last = null;
				node.#length = 0;
				let child: Node | null = first;
				while (child !== null) {
					child.#parent = this;
					child = child.#next;
				}
			}
			return ref;
		}
		const prev = ref.#prev;
		const next = ref.#next;
		if (prev === null) {
			this.#first = node;
		} else {
			prev.#next = node;
		}
		if (next === null) {
			this.#last = node;
		} else {
			next.#prev = node;
		}
		node.#parent = this;
		node.#prev = prev;
		node.#next = next;
		ref.#parent = null;
		ref.#prev = null;
		ref.#next = null;
		return ref;
	}

	append(...nodes: (Node | string)[]): void {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (typeof node === "string") {
				this.appendChild(new Text(node));
			} else {
				this.appendChild(node);
			}
		}
	}

	get textContent(): string {
		let text = "";
		let node = this.#first;
		while (node !== null) {
			if (node.nodeType !== 8) {
				text += node.textContent;
			}
			node = node.#next;
		}
		return text;
	}

	get outerHTML(): string {
		return this[NODE_APPEND_HTML_TO]("");
	}
}

export interface Node {
	nodeType: number;
	nodeName: string;
}

export class Range {
	#start: Node | null = null;
	#end: Node | null = null;

	setStartBefore(node: Node): void {
		this.#start = node;
	}

	setEndAfter(node: Node): void {
		this.#end = node;
	}

	extractContents(): DocumentFragment {
		return Node[NODE_EXTRACT_RANGE](this.#start, this.#end);
	}
}

export class DocumentFragment extends Node {
	static {
		this.prototype.nodeType = 11;
		this.prototype.nodeName = "#document-fragment";
	}
}

export class NoopComment extends Node {
	static {
		this.prototype.nodeType = 8;
		this.prototype.nodeName = "#comment";
	}

	#data: string;

	constructor(data: string) {
		super();
		this.#data = String(data);
	}

	get textContent() {
		return this.#data;
	}

	set textContent(data: string) {
		this.#data = String(data);
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		return html;
		// return html + "<!--" + this.#data + "-->";
	}
}

export class Text extends Node {
	static {
		this.prototype.nodeType = 3;
		this.prototype.nodeName = "#text";
	}

	#data: string;

	constructor(data: string) {
		super();
		this.#data = String(data);
	}

	get textContent() {
		return this.#data;
	}

	set textContent(data: string) {
		this.#data = String(data);
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		return htmlEscapeAppendTo(html, this.#data);
	}
}

export const XMLNS_HTML = 0;
export const XMLNS_SVG = 1;
export const XMLNS_MATHML = 2;

export type XMLNS = typeof XMLNS_HTML | typeof XMLNS_SVG | typeof XMLNS_MATHML;

export function resolveNamespaceURI(uri: string): XMLNS {
	switch (uri) {
		case HTML: return XMLNS_HTML;
		case SVG: return XMLNS_SVG;
		case MATHML: return XMLNS_MATHML;
		default: throw new Error("unsupported namespace uri");
	}
}

export function isVoidTag(xmlns: XMLNS, name: string): boolean {
	if (xmlns !== XMLNS_HTML) {
		return false;
	}
	switch (name) {
		case "area":
		case "base":
		case "br":
		case "col":
		case "embed":
		case "hr":
		case "img":
		case "input":
		case "link":
		case "meta":
		case "param":
		case "source":
		case "track":
		case "wbr":
			return true;
		default:
			return false;
	}
}

const ATTR_STALE = Symbol("stale");
const ATTR_INVALIDATE_PARSED = Symbol("invalidateParsed");

type Attrs = Map<string, string | typeof ATTR_STALE>;

export class ElementClassList {
	#attrs: Attrs;
	#value: string | null = null;
	#tokens: Set<string> | null = null;

	constructor(attrs: Attrs) {
		this.#attrs = attrs;
	}

	get length(): number {
		return this.#parseAttribute().size;
	}

	get value(): string {
		if (this.#value === null) {
			if (this.#tokens === null) {
				const raw = this.#attrs.get("class");
				return raw === ATTR_STALE ? "" : (raw ?? "");
			} else {
				let value = "";
				let first = true;
				for (const token of this.#tokens) {
					if (first) {
						value += token;
						first = false;
					} else {
						value = value + " " + token;
					}
				}
				this.#value = value;
			}
		}
		return this.#value;
	}

	#parseAttribute(): Set<string> {
		if (this.#tokens === null) {
			const value = this.#attrs.get("class");
			if (value === undefined || value === ATTR_STALE) {
				this.#tokens = new Set();
			} else {
				this.#tokens = new Set(value.split(" "));
			}
		}
		return this.#tokens;
	}

	#invalidateAttribute(): void {
		this.#value = null;
		this.#attrs.set("class", ATTR_STALE);
	}

	[ATTR_INVALIDATE_PARSED](): void {
		this.#tokens = null;
	}

	add(...tokens: string[]): void {
		const set = this.#parseAttribute();
		const prevSize = set.size;
		for (let i = 0; i < tokens.length; i++) {
			set.add(tokens[i]);
		}
		if (set.size !== prevSize) {
			this.#invalidateAttribute();
		}
	}

	contains(token: string): boolean {
		return this.#parseAttribute().has(token);
	}

	remove(...tokens: string[]): void {
		const set = this.#parseAttribute();
		const prevSize = set.size;
		for (let i = 0; i < tokens.length; i++) {
			set.delete(tokens[i]);
		}
		if (set.size !== prevSize) {
			this.#invalidateAttribute();
		}
	}

	replace(oldToken: string, newToken: string): boolean {
		const set = this.#parseAttribute();
		if (set.delete(oldToken)) {
			set.add(newToken);
			this.#invalidateAttribute();
			return true;
		}
		return false;
	}

	toggle(token: string, force?: boolean): boolean {
		const set = this.#parseAttribute();
		const prevSize = set.size;
		let exists = false;
		if (force === undefined) {
			if (!set.delete(token)) {
				set.add(token);
				exists = true;
			}
		} else if (force) {
			set.add(token);
			exists = true;

		} else {
			set.delete(token);
		}
		if (set.size !== prevSize) {
			this.#invalidateAttribute();
		}
		return exists;
	}

	values(): IterableIterator<string> {
		return this.#parseAttribute()[Symbol.iterator]();
	}

	[Symbol.iterator](): IterableIterator<string> {
		return this.#parseAttribute()[Symbol.iterator]();
	}
}

interface CssValue {
	value: string;
	important: boolean;
}

export class ElementStyles {
	#attrs: Attrs;
	#value: string | null = null;
	#props: Map<string, CssValue> | null = null;

	constructor(attrs: Attrs) {
		this.#attrs = attrs;
	}

	get cssText() {
		if (this.#value === null) {
			if (this.#props === null) {
				const raw = this.#attrs.get("style");
				return raw === ATTR_STALE ? "" : (raw ?? "");
			} else {
				let cssText = "";
				let first = true;
				for (const [name, value] of this.#props) {
					// TODO: Document that value should not contain untrusted data.
					if (first) {
						cssText = cssText + name + ": " + value.value;
						first = false;
					} else {
						cssText = cssText + "; " + name + ": " + value.value;
					}
					if (value.important) {
						cssText += " !important";
					}
				}
				this.#value = cssText;
			}
		}
		return this.#value;
	}

	#parseAttribute(): Map<string, CssValue> {
		if (this.#props === null) {
			const value = this.#attrs.get("style");
			if (value === undefined || value === "" || value === ATTR_STALE) {
				this.#props = new Map();
			} else {
				throw new Error("style attribute parsing is not supported");
			}
		}
		return this.#props;
	}

	#invalidateAttribute(): void {
		this.#value = null;
		this.#attrs.set("style", ATTR_STALE);
	}

	[ATTR_INVALIDATE_PARSED](): void {
		this.#props = null;
	}

	setProperty(name: string, value: string, priority?: "" | "important"): void {
		const props = this.#parseAttribute();
		props.set(name, { value: String(value), important: priority === "important" });
		this.#invalidateAttribute();
	}

	removeProperty(name: string): string {
		const props = this.#parseAttribute();
		const value = props.get(name);
		if (value === undefined) {
			return "";
		} else {
			props.delete(name);
			this.#invalidateAttribute();
			return value.value;
		}
	}

	getPropertyValue(name: string): string {
		const props = this.#parseAttribute();
		return props.get(name)?.value ?? "";
	}
}

export class Element extends Node {
	static {
		this.prototype.nodeType = 1;
	}

	#xmlns: XMLNS;
	#namespaceURI: string;
	#void: boolean | undefined;
	#tagName: string;
	#attrs: Attrs = new Map();
	#classList: ElementClassList | null = null;
	#styles: ElementStyles | null = null;

	constructor(namespaceURI: string, tagName: string) {
		super();
		this.#xmlns = resolveNamespaceURI(namespaceURI);
		this.#namespaceURI = namespaceURI;
		this.#tagName = tagName;
	}

	get tagName(): string {
		return this.#tagName;
	}

	get nodeName(): string {
		return this.#tagName;
	}

	get namespaceURI(): string {
		return this.#namespaceURI;
	}

	get innerHTML(): string {
		let html = "";
		let child = this.firstChild;
		while (child !== null) {
			html = child[NODE_APPEND_HTML_TO](html);
			child = child.nextSibling;
		}
		return html;
	}

	get classList(): ElementClassList {
		if (this.#classList === null) {
			this.#classList = new ElementClassList(this.#attrs);
		}
		return this.#classList;
	}

	get style(): ElementStyles {
		if (this.#styles === null) {
			this.#styles = new ElementStyles(this.#attrs);
		}
		return this.#styles;
	}

	focus(): void {
		// noop
	}

	blur(): void {
		// noop
	}

	#invalidateAttribute(name: string) {
		if (name === "class") {
			this.#classList?.[ATTR_INVALIDATE_PARSED]();
		} else if (name === "style") {
			this.#styles?.[ATTR_INVALIDATE_PARSED]();
		}
	}

	setAttribute(name: string, value: string): void {
		this.#attrs.set(name, String(value));
		this.#invalidateAttribute(name);
	}

	removeAttribute(name: string): void {
		this.#attrs.delete(name);
		this.#invalidateAttribute(name);
	}

	toggleAttribute(name: string, force?: boolean): void {
		const has = this.#attrs.has(name);
		force ??= !has;
		if (has !== force) {
			if (force) {
				this.#attrs.set(name, "");
			} else {
				this.#attrs.delete(name);
			}
		}
		this.#invalidateAttribute(name);
	}

	getAttribute(name: string): string | null {
		const value = this.#attrs.get(name);
		if (value === ATTR_STALE) {
			return this.#resolveStaleAttr(name);
		}
		return value ?? null;
	}

	hasAttribute(name: string): boolean {
		return this.#attrs.has(name);
	}

	#resolveStaleAttr(name: string): string {
		switch (name) {
			case "class": {
				const value = this.#classList!.value;
				this.#attrs.set(name, value);
				return value;
			}
			case "style": {
				const value = this.#styles!.cssText;
				this.#attrs.set(name, value);
				return value;
			}
			default: throw new Error("invalid internal state");
		}
	}

	#isVoidTag(): boolean {
		return this.#void ?? (this.#void = isVoidTag(this.#xmlns, this.#tagName));
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		html = html + "<" + this.#tagName;
		for (let [name, value] of this.#attrs) {
			if (value === ATTR_STALE) {
				value = this.#resolveStaleAttr(name);
			}
			html = htmlEscapeAppendTo(html + " " + name + "=\"", value) + "\"";
		}
		if (this.#isVoidTag()) {
			html += ">";
		} else if (this.hasChildNodes() || this.#xmlns === XMLNS_HTML) {
			html = super[NODE_APPEND_HTML_TO](html + ">") + "</" + this.#tagName + ">";
		} else {
			html += "/>";
		}
		return html;
	}
}

export class Window extends NoopEventTarget {
	static {
		this.prototype.Comment = NoopComment;
		this.prototype.CustomEvent = NoopEvent;
		this.prototype.Document = Document;
		this.prototype.DocumentFragment = DocumentFragment;
		this.prototype.Element = Element;
		this.prototype.Event = NoopEvent;
		this.prototype.Node = Node;
		this.prototype.Range = Range;
		this.prototype.Text = Text;
	}

	window = this;
	document = new Document();
}

export interface Window {
	Comment: typeof NoopComment;
	CustomEvent: typeof NoopEvent;
	Document: typeof Document;
	DocumentFragment: typeof DocumentFragment;
	Element: typeof Element;
	Event: typeof NoopEvent;
	Node: typeof Node;
	Range: typeof Range;
	Text: typeof Text;
}

/**
 * A global default rvxdom window instance.
 */
export const WINDOW = new Window();
