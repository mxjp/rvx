import type { Context } from "../context.js";
import type { TeardownHook } from "../lifecycle.js";

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
export interface TeardownFrame {
	push(hook: TeardownHook): void;
}

/**
 * A function that is called by a signal or batch when updated.
 */
export interface NotifyHook {
	(): void;
}

/**
 * A function that is called by a signal when accessed.
 */
export interface AccessHook {
	/**
	 * @param hooks See `Signal.#hooks`.
	 */
	(hooks: Set<NotifyHook>): void;
}

export const THROW_ON_LEAK: TeardownFrame = {
	push(_hook) {
		// Teardown hooks can not be registered outside of a lifecycle context.
		throw new Error("G5");
	},
};

/**
 * A stack where the last item may be an object which teardown hooks are captured in.
 *
 * `undefined` indicates that hooks are intentionally not captured.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [THROW_ON_LEAK];

/**
 * A stack where the top value is called for each tracked signal access.
 */
export const ACCESS_STACK: (AccessHook | undefined)[] = [];

/**
 * Internal utility to call a function with a specific stack frame.
 */
export function useStack<T, R>(stack: T[], frame: T, fn: () => R): R {
	try {
		stack.push(frame);
		return fn();
	} finally {
		stack.pop();
	}
}
