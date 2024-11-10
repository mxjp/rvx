import { HTML, MATHML, SVG } from "../core/element-common.js";

export const rvxDocument = {
	createTextNode(data: string) {
		return new RvxText(data);
	},

	createComment(data: string) {
		return new RvxComment(data);
	},

	createDocumentFragment() {
		return new RvxDocumentFragment();
	},

	createElementNS(namespaceURI: string, tagName: string) {
		return new RvxElement(namespaceURI, tagName);
	},

	createElement(tagName: string) {
		return new RvxElement(HTML, tagName);
	}
};

const NODE_LENGTH = Symbol("length");
const NODE_APPEND_HTML_TO = Symbol("appendHtmlTo");

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

export class RvxNode {
	static {
		this.prototype.ownerDocument = rvxDocument;
	}

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
	ownerDocument: typeof rvxDocument;
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

type Attrs = Map<string, string>;

export class RvxElement extends RvxNode {
	static {
		this.prototype.nodeType = 1;
	}

	#xmlns: XMLNS;
	#namespaceURI: string;
	#void: boolean | undefined;
	#tagName: string;
	#attrs: Attrs = new Map();

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

	setAttribute(name: string, value: string): void {
		this.#attrs.set(name, value);
	}

	removeAttribute(name: string): void {
		this.#attrs.delete(name);
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
	}

	getAttribute(name: string): string | null {
		return this.#attrs.get(name) ?? null;
	}

	hasAttribute(name: string): boolean {
		return this.#attrs.has(name);
	}

	#isVoidTag(): boolean {
		return this.#void ?? (this.#void = isVoidTag(this.#xmlns, this.#tagName));
	}

	[NODE_APPEND_HTML_TO](html: string): string {
		html = html + "<" + this.#tagName;
		for (const [name, value] of this.#attrs) {
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
