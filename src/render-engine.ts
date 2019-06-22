import { Binding, resolveBinding, resolveOutputBinding } from "./binding";
import { isCollectionLike } from "./collection-like";
import { Cycle } from "./cycle";
import { DomVnode } from "./dom-vnode";
import { isObservableLike } from "./observable-like";
import { RenderContext } from "./render-context";
import { RenderContextBase } from "./render-context-base";
import { RenderPatchCallback } from "./render-patch-callback";
import { RenderSlot } from "./render-slot";
import { Vnode, VnodeConstructor } from "./vnode";
import { RENDER } from "./vnode-internals";

const PATCH_SCHEDULED = Symbol("patchScheduled");
const BUFFERED_PATCHES = Symbol("bufferedPatches");

export type RenderPatchMode = "asap" | "frame";

export interface RenderEngineOptions {
	/**
	 * Specify, how the renderer applies patches.
	 * + `"asap"` - Apply patches *as soon as possible*. This is the default mode.
	 * + `"frame"` - Aggregate and apply patches in the next animation frame. (Experimental)
	 */
	readonly patchMode: RenderPatchMode;
}

/**
 * The core render engine of rvx.
 */
export class RenderEngine {
	public constructor(options: Partial<RenderEngineOptions> = { }) {
		this.patchMode = options.patchMode || "asap";
	}

	/**
	 * The patch mode that is used by this instance.
	 */
	public readonly patchMode: RenderPatchMode;

	/**
	 * The top level render context.
	 */
	public readonly context: RenderContext = new class extends RenderContextBase {
		public readonly parent: RenderContext = null;
		public readonly cycle = new Cycle();
	};

	private [PATCH_SCHEDULED] = false;
	private [BUFFERED_PATCHES] = new Map<Node, BufferedPatch[]>();

	/**
	 * Create a vnode instance.
	 * @param type The type. This can be a tag name or a vnode constructor.
	 */
	public createElement(type: string | VnodeConstructor, props: any, ...children: any[]): Vnode {
		if (typeof type === "string") {
			return new DomVnode(props, children, this, type);
		} else if (typeof type === "function") {
			return new type(props, children, this);
		} else {
			throw new TypeError("type must be a string or a vnode constructor.");
		}
	}

	/**
	 * Create a render slot that uses this engine.
	 */
	public createSlot() {
		return new RenderSlot(this);
	}

	/**
	 * Render content by appending it to a dom node.
	 */
	public appendTo(target: Node | string, content: any) {
		return this.createSlot().appendTo(target).render(content);
	}

	/**
	 * Replace a dom node with rendered content.
	 */
	public replace(target: Node | string, content: any) {
		return this.createSlot().replace(target).render(content);
	}

	/**
	 * Render any kind of supported content in the specified context and cycle.
	 */
	public renderContent(value: any, context: RenderContext, cycle: Cycle, patch: RenderPatchCallback) {
		if (Array.isArray(value)) {
			patch([]);
			const ranges: RenderRange[] = [];
			for (let i = 0; i < value.length; i++) {
				ranges.push({ start: null, end: null });
				this.renderContent(value[i], context, cycle, (nodes, start, end) => {
					if (!start) {
						start = findRenderStart(ranges, i);
						ranges[i].start = nodes[0];
					}
					if (!end) {
						end = findRenderEnd(ranges, i);
						ranges[i].end = nodes[nodes.length - 1];
					}
					patch(nodes, start, end);
				});
			}
		} else if (value instanceof Vnode) {
			value[RENDER](context, cycle, patch);
		} else if (value instanceof Node) {
			patch([value]);
		} else if (isObservableLike<any>(value)) {
			if (isCollectionLike<any>(value)) {
				const ranges: DynamicRenderRange[] = [];
				value.subscribe({
					resolve: value => {
						const insert = value.items.map<DynamicRenderRange>(item => ({ start: null, end: null, item, cycle: new Cycle() }));
						const removed = ranges.splice(value.start, value.count, ...insert);
						for (const range of removed) {
							range.cycle.dispose();
						}
						if (removed.length > 0) {
							patch([], findDynamicRenderStart(removed[0]), findDynamicRenderEnd(removed[removed.length - 1]));
						}
						linkDynamicRenderRanges(ranges, value.start, insert.length);
						for (const range of insert) {
							this.renderContent(range.item, context, range.cycle, (nodes, start, end) => {
								if (!start) {
									start = findDynamicRenderStart(range);
									range.start = nodes[0];
								}
								if (!end) {
									end = findDynamicRenderEnd(range);
									range.end = nodes[nodes.length - 1];
								}
								patch(nodes, start, end);
							});
						}
					},
					reject: value => {
						context.error(value);
					}
				});
			} else {
				const fork = cycle.fork();
				cycle.add(value.subscribe({
					resolve: value => {
						fork.dispose();
						this.renderContent(value, context, fork, patch);
					},
					reject: value => {
						patch([]);
						context.error(value);
					}
				}));
			}
		} else if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
			patch([]);
		} else {
			patch([document.createTextNode(String(value))]);
		}
	}

	/**
	 * Render any kind of supported content in the specified context and cycle.
	 */
	public renderContentFor(container: Node, value: any, context: RenderContext, cycle: Cycle) {
		this.renderContent(value, context, cycle, (nodes, start, end) => this.schedulePatch(container, nodes, start, end));
	}

	/**
	 * Schedule a patch to be applied.
	 */
	public schedulePatch(container: Node, nodes: Node[], start?: Node, end?: Node) {
		if (this.patchMode === "frame") {
			const buffer = this[BUFFERED_PATCHES];
			const patches = buffer.get(container);
			if (patches) {
				patches.push({ nodes, start, end });
			} else {
				buffer.set(container, [{ nodes, start, end }]);
			}
			if (!this[PATCH_SCHEDULED]) {
				this[PATCH_SCHEDULED] = true;
			}
			requestAnimationFrame(() => {
				this[PATCH_SCHEDULED] = false;
				for (const [container, patches] of buffer) {
					// TODO: Reduce compatible patches to actually increase performance.
					for (const { nodes, start, end } of patches) {
						applyPatch(container, nodes, start, end);
					}
				}
			});
		} else {
			applyPatch(container, nodes, start, end);
		}
	}

	/**
	 * Render attributes for a dom element in the specified context and cycle.
	 */
	public renderAttributes(element: Element, attributes: {
		[Name in string]: Binding<any>
	}, context: RenderContext, cycle: Cycle) {
		for (const name in attributes) {
			if (name.startsWith("on-")) {
				const eventName = name.slice(3);
				const fork = cycle.fork();
				cycle.add(resolveOutputBinding<Event>(attributes[name], output => {
					fork.dispose();
					if (output.type === "function") {
						element.addEventListener(eventName, output.value);
						fork.add(() => {
							element.removeEventListener(eventName, output.value);
						});
					} else {
						const listener = output.value.resolve.bind(output.value);
						element.addEventListener(eventName, listener);
						fork.add(() => {
							element.removeEventListener(eventName, listener);
						});
					}
				}, value => {
					context.error(value);
				}));
			} else {
				cycle.add(resolveBinding(attributes[name], value => {
					if (value === null || value === undefined || (typeof value === "number" && isNaN(value)) || value === false) {
						element.removeAttribute(name);
					} else if (value === true) {
						element.setAttribute(name, "");
					} else {
						element.setAttribute(name, value);
					}
				}, value => {
					context.error(value);
				}));
			}
		}
	}
}

interface RenderRange {
	start: Node;
	end: Node;
}

function findRenderStart(ranges: RenderRange[], index: number) {
	for (let i = index - 1; i >= 0; i--) {
		if (ranges[i].end) {
			return ranges[i].end;
		}
	}
}

function findRenderEnd(ranges: RenderRange[], index: number) {
	for (let i = index + 1; i < ranges.length; i++) {
		if (ranges[i].start) {
			return ranges[i].start;
		}
	}
}

interface DynamicRenderRange {
	start: Node;
	end: Node;
	item: any;
	cycle: Cycle;

	prev?: DynamicRenderRange;
	next?: DynamicRenderRange;
}

function findDynamicRenderStart(range: DynamicRenderRange) {
	range = range.prev;
	while (range) {
		if (range.end) {
			return range.end;
		}
		range = range.prev;
	}
}

function findDynamicRenderEnd(range: DynamicRenderRange) {
	range = range.next;
	while (range) {
		if (range.start) {
			return range.start;
		}
		range = range.next;
	}
}

function linkDynamicRenderRanges(ranges: DynamicRenderRange[], start: number, count: number) {
	if (start > 0) {
		ranges[start - 1].next = ranges[start];
	}
	const end = start + count;
	for (let i = start; i < end; i++) {
		ranges[i].prev = ranges[i - 1];
		ranges[i].next = ranges[i + 1];
	}
	if (end < ranges.length) {
		ranges[end].prev = ranges[end - 1];
	}
}

interface BufferedPatch {
	readonly nodes: Node[];
	readonly start: Node;
	readonly end: Node;
}

function applyPatch(container: Node, nodes: Node[], start?: Node, end?: Node) {
	// TODO: Use document fragments and ranges to increase performance for large patches.
	if (start) {
		if (end) {
			while (start.nextSibling !== end) {
				container.removeChild(start.nextSibling);
			}
			for (const node of nodes) {
				container.insertBefore(node, end);
			}
		} else {
			while (start.nextSibling) {
				container.removeChild(start.nextSibling);
			}
			for (const node of nodes) {
				container.appendChild(node);
			}
		}
	} else {
		if (end) {
			while (container.firstChild !== end) {
				container.removeChild(container.firstChild);
			}
			for (const node of nodes) {
				container.insertBefore(node, end);
			}
		} else {
			while (container.firstChild) {
				container.removeChild(container.firstChild);
			}
			for (const node of nodes) {
				container.appendChild(node);
			}
		}
	}
}
