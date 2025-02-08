import { Component } from "../core/component.js";
import { $ } from "../core/signals.js";
import { nest, View } from "../core/view.js";
import { ASYNC } from "./async-context.js";

/**
 * Render content depending on the state of an async function or promise.
 *
 * See {@link Async `<Async>`} when using JSX or when named properties are preferred.
 *
 * This task is tracked using the current {@link ASYNC async context} if any. It is guaranteed, that the view is updated before the tracked task completes.
 */
export function nestAsync<T>(source: (() => Promise<T>) | Promise<T>, component?: Component<T>, pending?: Component, rejected?: Component<unknown>): View {
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

	return nest(state, state => {
		switch (state.type) {
			case 0: return pending?.();
			case 1: return component?.(state.value as T);
			case 2: return rejected?.(state.value);
		}
	});
}

/**
 * Render content depending on the state of an async function or promise.
 *
 * See {@link nestAsync} when not using JSX or when positional arguments are preferred.
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
	return nestAsync(props.source, props.children, props.pending, props.rejected);
}
