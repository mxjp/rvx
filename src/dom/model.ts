import { HTML, MATHML, SVG } from "../core/element-common.js";

const NODE_LENGTH = Symbol("length");
const NODE_APPEND_HTML_TO = Symbol("appendHtmlTo");
const NODE_EXTRACT_RANGE = Symbol("extractRange");

class NodeListIterator implements Iterator<RvxNode> {
	#current: RvxNode | null;

	constructor(node: RvxNode) {
		this.#current = node.firstChild;
	}

	next(): IteratorResult<RvxNode, any> {
		const current = this.#current;
		if (current === null) {
			return { value: null, done: true };
		}
		this.#current = current.nextSibling;
		return { value: current, done: false };
	}
}

export class RvxNodeList {
	#node: RvxNode;

	constructor(node: RvxNode) {
		this.#node = node;
	}

	get length(): number {
		return this.#node[NODE_LENGTH]();
	}

	forEach(cb: (node: RvxNode, index: number, list: RvxNodeList) => void, thisArg?: unknown): void {
		let index = 0;
		let node = this.#node.firstChild;
		while (node !== null) {
			cb.call(thisArg, node, index, this);
			node = node.nextSibling;
			index++;
		}
	}

	[Symbol.iterator](): Iterator<RvxNode> {
		return new NodeListIterator(this.#node);
	}

	values(): Iterator<RvxNode> {
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

export class RvxNoopEventTarget {
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

export class RvxDocument extends RvxNoopEventTarget {
	get body(): RvxElement | null {
		// noop
		return null;
	}

	get activeElement(): RvxElement | null {
		// noop
		return null;
	}

	createTextNode(data: string) {
		return new RvxText(data);
	}

	createComment(data: string) {
		return new RvxComment(data);
	}

	createDocumentFragment() {
		return new RvxDocumentFragment();
	}

	createElementNS(namespaceURI: string, tagName: string) {
		return new RvxElement(namespaceURI, tagName);
	}

	createElement(tagName: string) {
		return new RvxElement(HTML, tagName);
	}
}

export class RvxNode extends RvxNoopEventTarget {
	#parent: RvxNode | null = null;
	#first: RvxNode | null = null;
	#last: RvxNode | null = null;
	#prev: RvxNode | null = null;
	#next: RvxNode | null = null;
	#length = 0;

	#childNodes: RvxNodeList | null = null;

	get parentNode(): RvxNode | null {
		return this.#parent;
	}

	get firstChild(): RvxNode | null {
		return this.#first;
	}

	get lastChild(): RvxNode | null {
		return this.#last;
	}

	get previousSibling(): RvxNode | null {
		return this.#prev;
	}

	get nextSibling(): RvxNode | null {
		return this.#next;
	}

	get childNodes(): RvxNodeList {
		if (this.#childNodes === null) {
			this.#childNodes = new RvxNodeList(this);
		}
		return this.#childNodes;
	}

	[NODE_LENGTH](): number {
		return this.#length;
	}

	[NODE_APPEND_HTML_TO](_html: string): string {
		throw new Error("not supported");
	}

	static [NODE_EXTRACT_RANGE](start: RvxNode | null, end: RvxNode | null): RvxDocumentFragment {
		if (start === null || end === null) {
			throw new Error("invalid range");
		}
		const parent = start.#parent;
		if (parent === null || parent !== end.#parent) {
			throw new Error("invalid range");
		}
		const fragment = new RvxDocumentFragment();
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

	contains(node: RvxNode | null) {
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

	removeChild(node: RvxNode): RvxNode {
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

	appendChild(node: RvxNode): RvxNode {
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
			let child: RvxNode | null = first;
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

	insertBefore(node: RvxNode, ref: RvxNode): RvxNode {
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
			let child: RvxNode | null = first;
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

	replaceChild(node: RvxNode, ref: RvxNode): RvxNode {
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
				let child: RvxNode | null = first;
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

export interface RvxNode {
	nodeType: number;
	nodeName: string;
}

export class RvxRange {
	#start: RvxNode | null = null;
	#end: RvxNode | null = null;

	setStartBefore(node: RvxNode): void {
		this.#start = node;
	}

	setEndAfter(node: RvxNode): void {
		this.#end = node;
	}

	extractContents(): RvxDocumentFragment {
		return RvxNode[NODE_EXTRACT_RANGE](this.#start, this.#end);
	}
}

export class RvxDocumentFragment extends RvxNode {
	static {
		this.prototype.nodeType = 11;
		this.prototype.nodeName = "#document-fragment";
	}
}

export class RvxComment extends RvxNode {
	static {
		this.prototype.nodeType = 8;
		this.prototype.nodeName = "#comment";
	}

	#data: string;

	constructor(data: string) {
		super();
		this.#data = data;
	}

	get textContent() {
		return this.#data;
	}

	set textContent(data: string) {
		this.#data = data;
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		return html + "<!--" + this.#data + "-->";
	}
}

export class RvxText extends RvxNode {
	static {
		this.prototype.nodeType = 3;
		this.prototype.nodeName = "#text";
	}

	#data: string;

	constructor(data: string) {
		super();
		this.#data = data;
	}

	get textContent() {
		return this.#data;
	}

	set textContent(data: string) {
		this.#data = data;
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

export class RvxElementClassList {
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
		if (this.#tokens?.size === 0) {
			this.#attrs.delete("class");
		} else {
			this.#attrs.set("class", ATTR_STALE);
		}
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

export class RvxElementStyles {
	#attrs: Attrs;
	#value: string | null = null;
	#props: Map<string, string> | null = null;

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
						cssText = cssText + name + ": " + value;
						first = false;
					} else {
						cssText = cssText + "; " + name + ": " + value;
					}
				}
				this.#value = cssText;
			}
		}
		return this.#value;
	}

	#parseAttribute(): Map<string, string> {
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
		if (this.#props?.size === 0) {
			this.#attrs.delete("style");
		} else {
			this.#attrs.set("style", ATTR_STALE);
		}
	}

	[ATTR_INVALIDATE_PARSED](): void {
		this.#props = null;
	}

	setProperty(name: string, value: string, priority?: "" | "important"): void {
		const props = this.#parseAttribute();
		if (priority === "important") {
			value += " !important";
		}
		props.set(name, value);
		this.#invalidateAttribute();
	}

	removeProperty(name: string): void {
		const props = this.#parseAttribute();
		if (props.delete(name)) {
			this.#invalidateAttribute();
		}
		// TODO: Document, that this returns undefined instead of the removed value.
	}
}

export class RvxElement extends RvxNode {
	static {
		this.prototype.nodeType = 1;
	}

	#xmlns: XMLNS;
	#namespaceURI: string;
	#void: boolean | undefined;
	#tagName: string;
	#attrs: Attrs = new Map();
	#classList: RvxElementClassList | null = null;
	#styles: RvxElementStyles | null = null;

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

	get classList(): RvxElementClassList {
		if (this.#classList === null) {
			this.#classList = new RvxElementClassList(this.#attrs);
		}
		return this.#classList;
	}

	get style(): RvxElementStyles {
		if (this.#styles === null) {
			this.#styles = new RvxElementStyles(this.#attrs);
		}
		return this.#styles;
	}

	focus(): void {
		// noop
	}

	blur(): void {
		// noop
	}

	append(...nodes: (RvxNode | string)[]): void {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (typeof node === "string") {
				this.appendChild(new RvxText(node));
			} else {
				this.appendChild(node);
			}
		}
	}

	#invalidateAttribute(name: string) {
		if (name === "class") {
			this.#classList?.[ATTR_INVALIDATE_PARSED]();
		} else if (name === "style") {
			this.#styles?.[ATTR_INVALIDATE_PARSED]();
		}
	}

	setAttribute(name: string, value: string): void {
		this.#attrs.set(name, value);
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
			html += ">";
			let child = this.firstChild;
			while (child !== null) {
				html = child[NODE_APPEND_HTML_TO](html);
				child = child.nextSibling;
			}
			html = html + "</" + this.#tagName + ">";
		} else {
			html += "/>";
		}
		return html;
	}
}

export class RvxWindow extends RvxNoopEventTarget {
	static {
		this.prototype.Comment = RvxComment;
		this.prototype.Document = RvxDocument;
		this.prototype.DocumentFragment = RvxDocumentFragment;
		this.prototype.Element = RvxElement;
		this.prototype.Node = RvxNode;
		this.prototype.Range = RvxRange;
		this.prototype.Text = RvxText;
	}

	window = this;
	document = new RvxDocument();
}

export interface RvxWindow {
	Comment: typeof RvxComment;
	Document: typeof RvxDocument;
	DocumentFragment: typeof RvxDocumentFragment;
	Element: typeof RvxElement;
	Node: typeof RvxNode;
	Range: typeof RvxRange;
	Text: typeof RvxText;
}
