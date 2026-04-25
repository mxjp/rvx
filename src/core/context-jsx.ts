import { Context, ContextState } from "./context.js";

/**
 * Component for providing context values while rendering.
 *
 * See {@link Context.provide} or {@link Context.prototype.provide} when not using JSX.
 */
export function Provide<T>(props: {
	/** The context to provide a value for. */
	context: Context<T>;
	/** The value to provide. */
	value: T | null | undefined;
	children: () => unknown;
} | {
	/** The context states to provide. */
	states: ContextState<unknown>[];
	children: () => unknown;
}): unknown {
	if ("context" in props) {
		return props.context.provide(props.value, props.children);
	}
	return Context.provide(props.states, props.children);
}
