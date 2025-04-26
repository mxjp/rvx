import { ACCESS_STACK, LEAK, TEARDOWN_STACK, TRACKING_STACK } from "./internals/stacks.js";
import type { uncapture } from "./lifecycle.js";
import type { track, untrack } from "./signals.js";

/**
 * Run a function in isolation from the following side effect causing APIs:
 * + Teardown hooks are leaked. To isolate only teardown hooks, use {@link uncapture} instead.
 * + Signal accesses are not tracked and the default tracking behavior is restored. To only control the tracking behavior, use {@link track} or {@link untrack} instead.
 *
 * Note, that batches and contexts are not isolated.
 *
 * @param fn The function to run.
 * @param args The function arguments.
 * @returns The function's return value.
 */
export function isolate<F extends (...args: any) => any>(fn: F, ...args: Parameters<F>): ReturnType<F> {
	try {
		TEARDOWN_STACK.push(LEAK);
		ACCESS_STACK.push(undefined);
		TRACKING_STACK.push(true);
		return fn(...args);
	} finally {
		TEARDOWN_STACK.pop();
		ACCESS_STACK.pop();
		TRACKING_STACK.pop();
	}
}
