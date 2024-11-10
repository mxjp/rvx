
const NODE_LENGTH = Symbol("length");
const NODE_APPEND_HTML_TO = Symbol("concatHtml");

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
		if (node instanceof RvxDocumentFragment) {
			throw new Error("not implemented");
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

	get textContent(): string {
		throw new Error("not implemented");
	}

	get outerHTML(): string {
		return this[NODE_APPEND_HTML_TO]("");
	}
}

export class RvxDocumentFragment extends RvxNode {}
