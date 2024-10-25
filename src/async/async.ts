import { sig } from "../core/signals.js";
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

	const state = sig<{
		type: "pending";
		value: undefined;
	} | {
		type: "resolved";
		value: T;
	} | {
		type: "rejected";
		value: unknown;
	}>({ type: "pending", value: undefined });

	let promise: Promise<T>;
	if (typeof source === "function") {
		promise = (async () => source())();
	} else {
		promise = source;
	}

	const ac = ASYNC.current;
	promise.then(value => {
		state.value = { type: "resolved", value };
	}, (value: unknown) => {
		state.value = { type: "rejected", value };
		if (ac === undefined && rejected === undefined) {
			void Promise.reject(value);
		}
	});
	ac?.track(promise);

	return Nest({
		children: () => {
			switch (state.value.type) {
				case "pending": return pending;
				case "resolved": {
					const { value } = state.value;
					return children ? (() => children(value)) : undefined;
				}
				case "rejected": {
					const { value } = state.value;
					return rejected ? (() => rejected(value)) : undefined;
				}
			}
		},
	});
}
