import { $ } from "../core/signals.js";
import { Nest, View } from "../core/view.js";
import { ASYNC } from "./async-context.js";

/**
 * Renders content depending on the state of an async function or promise.
 *
 * This task is tracked using the current {@link ASYNC async context} if any. It is guaranteed, that the view is updated before the tracked task completes.
 */
export function Async<T>(props: {
	/**
	 * The async function or promise.
	 */
	source: (() => Promise<T>) | Promise<T>;

	/**
	 * A function render content while pending.
	 *
	 * By default, nothing is rendered.
	 */
	pending?: () => unknown;

	/**
	 * A function to render content when resolved.
	 *
	 * By default, nothing is rendered.
	 */
	children?: (value: T) => unknown;

	/**
	 * A function to render content when rejected.
	 *
	 * By default, nothing is rendered.
	 */
	rejected?: (value: unknown) => unknown;
}): View {
	const { source, pending, children, rejected } = props;
	const state = $({ type: 0, value: undefined as unknown });

	let promise: Promise<T>;
	if (typeof source === "function") {
		promise = (async () => source())();
	} else {
		promise = source;
	}

	const ac = ASYNC.current;
	promise.then(value => {
		state.value = { type: 1, value };
	}, (value: unknown) => {
		state.value = { type: 2, value };
		if (ac === undefined && rejected === undefined) {
			void Promise.reject(value);
		}
	});
	ac?.track(promise);

	return Nest({
		watch: state,
		children: state => {
			switch (state.type) {
				case 0: return pending?.();
				case 1: return children?.(state.value as T);
				case 2: return rejected?.(state.value);
			}
		}
	});
}
