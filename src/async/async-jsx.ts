import type { Component, View } from "../core/index.js";
import { nestAsync } from "./async.js";

/**
 * Render content depending on the state of an async function or promise.
 *
 * See {@link nestAsync} when not using JSX or when positional arguments are preferred.
 *
 * This task is tracked using the current {@link ASYNC async context} if any. It is guaranteed that the view is updated before the tracked task completes.
 */
export function Async<T>(props: {
	/**
	 * The async function or promise.
	 *
	 * If this is a function, it runs {@link isolate isolated}.
	 */
	source: (() => Promise<T>) | Promise<T>;

	/**
	 * A component to render content when resolved.
	 *
	 * + The resolved value is passed as the first argument.
	 * + Nothing is rendered by default.
	 */
	children?: Component<T>;

	/**
	 * A component to render content while pending.
	 *
	 * + Nothing is rendered by default.
	 */
	pending?: Component;

	/**
	 * A component to render content when rejected.
	 *
	 * + The rejected error is passed as the first argument.
	 * + Nothing is rendered by default.
	 */
	rejected?: Component<unknown>;
}): View {
	return nestAsync(props.source, props.children, props.pending, props.rejected);
}
