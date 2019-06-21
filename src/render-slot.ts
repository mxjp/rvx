import { Cycle } from "./cycle";
import { RenderContextBase } from "./render-context-base";
import { RenderEngine } from "./render-engine";

export class RenderSlot extends RenderContextBase {
	public constructor(public readonly engine: RenderEngine) {
		super();
		this._start = document.createComment("rvx");
		this._end = document.createComment("/rvx");
	}

	public readonly cycle = new Cycle();

	private readonly _start: Node;
	private readonly _end: Node;
	private _container: Node;
	private _rendering: boolean;

	public get parent() {
		return this.engine.context;
	}

	public appendTo(target: Node | string) {
		if (this._container) {
			throw new Error("Slot is already attached.");
		}
		this._container = resolveTarget(target);
		this._container.appendChild(this._start);
		this._container.appendChild(this._end);
		return this;
	}

	public replace(target: Node | string) {
		if (this._container) {
			throw new Error("Slot is already attached.");
		}
		const placeholder = resolveTarget(target);
		this._container = placeholder.parentNode;
		this._container.replaceChild(this._end, placeholder);
		this._container.insertBefore(this._start, this._end);
		return this;
	}

	public render(content: any) {
		if (this._rendering) {
			throw new Error("Slot is already rendering.");
		}
		if (!this._container) {
			throw new Error("Slot is not attached.");
		}
		this._rendering = true;
		this.engine.renderContent(content, this, this.cycle, (nodes, start, end) => {
			this.engine.schedulePatch(this._container, nodes, start || this._start, end || this._end);
		});
		return this;
	}
}

function resolveTarget(target: Node | string) {
	if (typeof target === "string") {
		const element = document.querySelector(target);
		if (!element) {
			throw new Error(`Unable to find target: ${target}`);
		}
		return element;
	}
	return target;
}
