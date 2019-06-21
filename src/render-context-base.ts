import { Cycle } from "./cycle";
import { RenderContext } from "./render-context";

/**
 * Base implementation for most render contexts.
 */
export abstract class RenderContextBase implements RenderContext {
	public readonly abstract parent?: RenderContext;
	public readonly abstract cycle: Cycle;

	public error(value: any, source: RenderContext = this) {
		if (this.parent) {
			this.parent.error(value, source);
		} else {
			// tslint:disable-next-line: no-console
			console.error(value, source);
		}
	}
}
