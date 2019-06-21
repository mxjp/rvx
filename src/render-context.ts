import { Cycle } from "./cycle";

/**
 * An abstract context in that things are rendered.
 */
export interface RenderContext {
	/**
	 * The render context parent.
	 */
	readonly parent?: RenderContext;
	/**
	 * The lifecycle of this render context.
	 */
	readonly cycle: Cycle;

	/**
	 * Called to raise an error that occured somewhere "inside" the render context.
	 * @param value The error.
	 * @param source The source render context.
	 */
	error(value: any, source?: RenderContext): void;
}
