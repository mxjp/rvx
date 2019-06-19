import { Cycle } from "./cycle";
import { RenderContext } from "./render-context";

export abstract class RenderContextBase implements RenderContext {
	public readonly abstract parent?: RenderContext;
	public readonly abstract cycle: Cycle;
}
