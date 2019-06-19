import { Cycle } from "./cycle";

export interface RenderContext {
	readonly parent?: RenderContext;
	readonly cycle: Cycle;
}
