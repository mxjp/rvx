import { isCollectionLike } from "./collection-like";
import { Cycle } from "./cycle";
import { DomVnode } from "./dom-vnode";
import { DynamicRenderRange, findDynamicRenderEnd, findDynamicRenderStart, linkDynamicRenderRanges } from "./dynamic-render-range";
import { isObservableLike } from "./observable-like";
import { RenderContext } from "./render-context";
import { RenderContextBase } from "./render-context-base";
import { RenderPatchCallback } from "./render-patch-callback";
import { findRenderEnd, findRenderStart, RenderRange } from "./render-range";
import { RenderSlot } from "./render-slot";
import { resolveBinding } from "./resolve-binding";
import { Vnode } from "./vnode";
import { VnodeConstructor } from "./vnode-constructor";
import { RENDER } from "./vnode-internals";

export class RenderEngine {
	public readonly context: RenderContext = new class extends RenderContextBase {
		public readonly parent: RenderContext = null;
		public readonly cycle = new Cycle();
	};

	public createElement(type: string | VnodeConstructor, props: any, ...children: any[]): Vnode {
		if (typeof type === "string") {
			return new DomVnode(props, children, this, type);
		} else if (typeof type === "function") {
			return new type(props, children, this);
		} else {
			throw new TypeError("type must be a string or a vnode constructor.");
		}
	}

	public createSlot() {
		return new RenderSlot(this);
	}

	public appendTo(target: Node | string, content: any) {
		return this.createSlot().appendTo(target).render(content);
	}

	public replace(target: Node | string, content: any) {
		return this.createSlot().replace(target).render(content);
	}

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

	public renderContentFor(container: Node, value: any, context: RenderContext, cycle: Cycle) {
		this.renderContent(value, context, cycle, (nodes, start, end) => this.patch(container, nodes, start, end));
	}

	public patch(container: Node, nodes: Node[], start?: Node, end?: Node) {
		// TODO: Aggregate and merge patches and apply them in a queued microtask (+ toggle option for testing purposes).
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

	public renderAttributes(element: Element, attributes: {
		[Name in string]: string
	}, context: RenderContext, cycle: Cycle) {
		for (const name in attributes) {
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
