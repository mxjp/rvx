import { Context } from "../core/context.js";
import { HTML } from "../core/element-common.js";
import { isVoidTag, resolveNamespaceURI, XMLNS, XMLNS_HTML } from "./internals/element-info.js";
import { htmlEscapeAppendTo } from "./internals/html-escape.js";
import { WINDOW_MARKER } from "./internals/window-marker.js";

const NODE_LENGTH = Symbol("length");
const NODE_APPEND_HTML_TO = Symbol("appendHtmlTo");

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

export class Event {}

/**
 * @deprecated Use {@link Event} instead.
 */
export const NoopEvent = Event;

export class EventTarget {
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

/**
 * @deprecated Use {@link EventTarget} instead.
 */
export const NoopEventTarget = EventTarget;

export class Document extends EventTarget {
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
		return new Comment(data);
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

export class Node extends EventTarget {
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

	/**
	 * Get the direct number of child nodes.
	 */
	[NODE_LENGTH](): number {
		return this.#length;
	}

	/**
	 * Append the HTML representation of this node to the specified HTML string.
	 *
	 * @param html An existing HTML string.
	 * @returns The concatenated HTML string.
	 */
	[NODE_APPEND_HTML_TO](html: string): string {
		let child = this.firstChild;
		while (child !== null) {
			html = child[NODE_APPEND_HTML_TO](html);
			child = child.nextSibling;
		}
		return html;
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

	remove(): void {
		this.#parent?.removeChild(this);
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

	replaceChildren(...nodes: (Node | string)[]): void {
		let child = this.#first;
		while (child !== null) {
			const next = child.#next;
			child.#parent = null;
			child.#prev = null;
			child.#next = null;
			child = next;
		}
		this.#length = 0;
		this.#first = null;
		this.#last = null;
		this.append(...nodes);
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

export class DocumentFragment extends Node {
	static {
		this.prototype.nodeType = 11;
		this.prototype.nodeName = "#document-fragment";
	}
}

/**
 * A context that controls if newly created comment nodes are visible in rendered html.
 *
 * **SECURITY:** Comment data is not escaped when rendering and can be used to produce invalid or malicious HTML.
 *
 * @default false
 */
export const VISIBLE_COMMENTS = new Context(false);

export class Comment extends Node {
	static {
		this.prototype.nodeType = 8;
		this.prototype.nodeName = "#comment";
	}

	#data: string;
	#visible = VISIBLE_COMMENTS.current;

	constructor(data: string) {
		super();
		this.#data = String(data);
	}

	/**
	 * Get or set comment data.
	 *
	 * **SECURITY:** Comment data is not escaped when rendering and can be used to produce invalid or malicious HTML.
	 */
	get textContent() {
		return this.#data;
	}

	set textContent(data: string) {
		this.#data = String(data);
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		if (this.#visible) {
			return html + "<!--" + this.#data + "-->";
		} else {
			return html;
		}
	}
}

/**
 * @deprecated Use {@link Comment} instead.
 */
export const NoopComment = Comment;

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

const ATTR_CHANGED = Symbol("attrChanged");

interface Attribute {
	name: string;
	value: string;
	stale: boolean;
}

export class ElementClassList {
	#attrs: Attribute[];
	#attr: Attribute | null = null;
	#tokens: string[] | null = null;

	constructor(attrs: Attribute[]) {
		this.#attrs = attrs;
	}

	get length(): number {
		return this.#parse().length;
	}

	get value(): string {
		const attr = this.#attr;
		if (attr === null || attr.stale) {
			const tokens = this.#tokens;
			if (tokens === null) {
				return "";
			}
			let value = "";
			for (let i = 0; i < tokens.length; i++) {
				if (i > 0) {
					value += " ";
				}
				value += tokens[i];
			}
			attr!.value = value;
			attr!.stale = false;
			return value;
		}
		return attr.value;
	}

	#parse(): string[] {
		let tokens = this.#tokens;
		if (tokens === null) {
			const attr = this.#attr;
			if (attr === null || attr.stale) {
				tokens = [];
			} else {
				tokens = attr.value.split(" ");
			}
			this.#tokens = tokens;
		}
		return tokens;
	}

	#setAttrStale(): void {
		const attr = this.#attr;
		if (attr === null) {
			this.#attrs.push(this.#attr = { name: "class", value: "", stale: true });
		} else {
			attr.stale = true;
		}
	}

	[ATTR_CHANGED](attr: Attribute | null): void {
		this.#attr = attr;
		this.#tokens = null;
	}

	add(...tokens: string[]): void {
		const set = this.#parse();
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (!set.includes(token)) {
				set.push(token);
			}
		}
		this.#setAttrStale();
	}

	contains(token: string): boolean {
		return this.#parse().includes(String(token));
	}

	remove(...tokens: string[]): void {
		const set = this.#parse();
		for (let i = 0; i < tokens.length; i++) {
			const token = String(tokens[i]);
			const index = set.indexOf(token);
			if (index >= 0) {
				set.splice(index, 1);
			}
		}
		this.#setAttrStale();
	}

	replace(oldToken: string, newToken: string): boolean {
		const set = this.#parse();
		const index = set.indexOf(String(oldToken));
		if (index >= 0) {
			set[index] = String(newToken);
			this.#setAttrStale();
			return true;
		}
		return false;
	}

	toggle(token: string, force?: boolean): boolean {
		token = String(token);
		const set = this.#parse();
		const index = set.indexOf(token);
		let exists = false;
		if (force === undefined) {
			if (index < 0) {
				set.push(token);
				exists = true;
			} else {
				set.splice(index, 1);
			}
		} else if (force) {
			if (index < 0) {
				set.push(token);
			}
			exists = true;
		} else if (index >= 0) {
			set.splice(index, 1);
		}
		this.#setAttrStale();
		return exists;
	}

	values(): IterableIterator<string> {
		return this.#parse()[Symbol.iterator]();
	}

	[Symbol.iterator](): IterableIterator<string> {
		return this.#parse()[Symbol.iterator]();
	}
}

interface StyleProp {
	name: string;
	value: string;
	important: boolean;
}

export class ElementStyles {
	#attrs: Attribute[];
	#attr: Attribute | null = null;
	#props: StyleProp[] | null = null;

	constructor(attrs: Attribute[]) {
		this.#attrs = attrs;
	}

	get cssText(): string {
		const attr = this.#attr;
		if (attr === null || attr.stale) {
			const props = this.#props;
			if (props === null) {
				return "";
			}
			let cssText = "";
			for (let i = 0; i < props.length; i++) {
				const prop = props[i];
				if (i > 0) {
					cssText += "; ";
				}
				cssText = cssText + prop.name + ": " + prop.value;
				if (prop.important) {
					cssText += " !important";
				}
			}
			attr!.stale = false;
			attr!.value = cssText;
			return cssText;
		}
		return attr.value;
	}

	#parse(): StyleProp[] {
		let props = this.#props;
		if (props === null) {
			const attr = this.#attr;
			if (attr === null || attr.stale || attr.value === "") {
				this.#props = props = [];
			} else {
				throw new Error("style attribute parsing is not supported");
			}
		}
		return props;
	}

	#setAttrStale(): void {
		const attr = this.#attr;
		if (attr === null) {
			this.#attrs.push(this.#attr = { name: "style", value: "", stale: true });
		} else {
			attr.stale = true;
		}
	}

	[ATTR_CHANGED](attr: Attribute | null): void {
		this.#attr = attr;
		this.#props = null;
	}

	setProperty(name: string, value: string, priority?: "" | "important"): void {
		const props = this.#parse();
		for (let i = 0; i < props.length; i++) {
			const prop = props[i];
			if (prop.name === name) {
				prop.value = String(value);
				prop.important = priority === "important";
				this.#setAttrStale();
				return;
			}
		}
		props.push({
			name,
			value: String(value),
			important: priority === "important",
		});
		this.#setAttrStale();
	}

	removeProperty(name: string): string {
		const props = this.#parse();
		for (let i = 0; i < props.length; i++) {
			const prop = props[i];
			if (prop.name === name) {
				props.splice(i, 1);
				this.#setAttrStale();
				return prop.value;
			}
		}
		return "";
	}

	getPropertyValue(name: string): string {
		const props = this.#parse();
		for (let i = 0; i < props.length; i++) {
			const prop = props[i];
			if (prop.name === name) {
				return prop.value;
			}
		}
		return "";
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
	#attrs: Attribute[] = [];
	#classList = new ElementClassList(this.#attrs);
	#styles = new ElementStyles(this.#attrs);

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

	set innerHTML(html: string) {
		this.replaceChildren(new RawHTML(html));
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

	#attrChanged(name: string, attr: Attribute | null) {
		switch (name) {
			case "class":
				this.#classList[ATTR_CHANGED](attr);
				break;
			case "style":
				this.#styles[ATTR_CHANGED](attr);
				break;
		}
	}

	setAttribute(name: string, value: string): void {
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			if (attr.name === name) {
				attr.value = String(value);
				attr.stale = false;
				this.#attrChanged(name, attr);
				return;
			}
		}
		const attr: Attribute = {
			name,
			value: String(value),
			stale: false,
		};
		attrs.push(attr);
		this.#attrChanged(name, attr);
	}

	removeAttribute(name: string): void {
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			if (attr.name === name) {
				attrs.splice(i, 1);
				this.#attrChanged(name, null);
				return;
			}
		}
	}

	toggleAttribute(name: string, force?: boolean): void {
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			if (attr.name === name) {
				if (force === undefined || !force) {
					attrs.splice(i, 1);
					this.#attrChanged(name, null);
				}
				return;
			}
		}
		if (force === undefined || force) {
			const attr: Attribute = {
				name,
				value: "",
				stale: false,
			};
			attrs.push(attr);
			this.#attrChanged(name, attr);
		}
	}

	getAttribute(name: string): string | null {
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			if (attr.name === name) {
				return this.#resolveAttr(attr);
			}
		}
		return null;
	}

	hasAttribute(name: string): boolean {
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			if (attrs[i].name === name) {
				return true;
			}
		}
		return false;
	}

	#resolveAttr(attr: Attribute): string {
		if (attr.stale) {
			switch (attr.name) {
				case "class": return this.#classList.value;
				case "style": return this.#styles.cssText;
				default: throw new Error("invalid internal state");
			}
		}
		return attr.value;
	}

	#isVoidTag(): boolean {
		return this.#void ?? (this.#void = isVoidTag(this.#xmlns, this.#tagName));
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		html = html + "<" + this.#tagName;
		const attrs = this.#attrs;
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			html = htmlEscapeAppendTo(html + " " + attr.name + "=\"", this.#resolveAttr(attr)) + "\"";
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

export class RawHTML extends Node {
	#html: string;

	constructor(html: string) {
		super();
		this.#html = html;
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		return html + this.#html;
	}
}

export class Window extends EventTarget {
	static {
		this.prototype[WINDOW_MARKER] = true;
		this.prototype.Comment = Comment;
		this.prototype.CustomEvent = Event;
		this.prototype.Document = Document;
		this.prototype.DocumentFragment = DocumentFragment;
		this.prototype.Element = Element;
		this.prototype.Event = Event;
		this.prototype.Node = Node;
		this.prototype.Text = Text;
	}

	window = this;
	document = new Document();
}

export interface Window {
	[WINDOW_MARKER]: boolean;
	Comment: typeof Comment;
	CustomEvent: typeof Event;
	Document: typeof Document;
	DocumentFragment: typeof DocumentFragment;
	Element: typeof Element;
	Event: typeof Event;
	Node: typeof Node;
	Text: typeof Text;
}

/**
 * A global default rvxdom window instance.
 */
export const WINDOW = new Window();
