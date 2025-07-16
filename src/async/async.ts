import { isolate } from "../core/isolate.js";
import { $ } from "../core/signals.js";
import type { Component } from "../core/types.js";
import { nest, View } from "../core/view.js";
import { ASYNC } from "./async-context.js";

/**
 * Render content depending on the state of an async function or promise.
 *
 * See {@link Async `<Async>`} when using JSX or when named properties are preferred.
 *
 * This task is tracked using the current {@link ASYNC async context} if any. It is guaranteed, that the view is updated before the tracked task completes.
 *
 * @param source The async function or promise.
 * + If this is a function, it runs {@link isolate isolated}.
 * @param component A component to render content when resolved.
 * + The resolved value is passed as the first argument.
 * + Nothing is rendered by default.
 * @param pending A component to render while pending.
 * + Nothing is rendered by default.
 * @param rejected A component to render content when rejected.
 * + The rejected error is passed as the first argument.
 * + Nothing is rendered by default.
 */
export function nestAsync<T>(source: (() => Promise<T>) | Promise<T>, component?: Component<T>, pending?: Component, rejected?: Component<unknown>): View {
	const state = $({ type: 0, value: undefined as unknown });

	let promise: Promise<T>;
	if (typeof source === "function") {
		promise = isolate(source);
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
	 * A component render content while pending.
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
