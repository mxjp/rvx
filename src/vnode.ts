import { Cycle } from "./cycle";
import { RenderContext } from "./render-context";
import { RenderContextBase } from "./render-context-base";
import { RenderEngine } from "./render-engine";
import { RenderPatchCallback } from "./render-patch-callback";
import { RenderPatchMirror } from "./render-patch-mirror";
import { RENDER } from "./vnode-internals";

const PARENT = Symbol("parent");
const CYCLE = Symbol("cycle");
const PATCH_CALLBACK = Symbol("patchCallback");
const PATCH_MIRROR = Symbol("patchMirror");

export abstract class Vnode<Props = any> extends RenderContextBase {
	public constructor(
		public readonly props: Props,
		public readonly children: any[],
		public readonly engine: RenderEngine
	) {
		super();
	}

	private [PARENT]: RenderContext = null;
	private [CYCLE]: Cycle = null;
	private [PATCH_CALLBACK]: RenderPatchCallback = null;
	private [PATCH_MIRROR]: RenderPatchMirror = null;

	public get parent(): RenderContext {
		return this[PARENT];
	}

	public get cycle(): Cycle {
		return this[CYCLE];
	}

	protected resolveContext(context: RenderContext) {
		return context;
	}

	protected resolveCycle(context: RenderContext, cycle: Cycle) {
		return cycle;
	}

	protected abstract render(): any;

	public [RENDER](context: RenderContext, cycle: Cycle, patch: RenderPatchCallback) {
		if (this[CYCLE]) {
			if (this.resolveContext(context) !== this[PARENT]) {
				throw new Error("Vnode has an active cycle in a different context.");
			}
			if (this[PATCH_CALLBACK]) {
				throw new Error("Vnode is already used in a different context or position.");
			}
			patch(this[PATCH_MIRROR].nodes);
			this[PATCH_CALLBACK] = patch;
		} else {
			this[PARENT] = this.resolveContext(context);
			this[CYCLE] = this.resolveCycle(context, cycle);
			this[CYCLE].add(() => {
				this[PARENT] = null;
				this[CYCLE] = null;
			});
			if (this[CYCLE] !== cycle) {
				this[PATCH_MIRROR] = new RenderPatchMirror();
			}
			this[PATCH_CALLBACK] = patch;
			this.engine.renderContent(this.render(), this, this[CYCLE], (nodes, start, end) => {
				if (this[PATCH_CALLBACK]) {
					this[PATCH_CALLBACK](nodes, start, end);
				}
				if (this[PATCH_MIRROR]) {
					this[PATCH_MIRROR].patch(nodes, start, end);
				}
			});
		}
		cycle.add(() => {
			this[PATCH_CALLBACK] = null;
		});
	}
}
