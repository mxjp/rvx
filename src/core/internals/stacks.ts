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

/**
 * A stack where the last item may be an array which teardown hooks are captured in.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [];

/**
 * A stack where the top value controls if signal accesses are currently tracked.
 */
export const TRACKING_STACK: boolean[] = [true];

/**
 * A stack where the top value is called for each tracked signal access.
 */
export const ACCESS_STACK: (AccessHook | undefined)[] = [];

/**
 * Stack of context windows.
 *
 * Each context window is a stack of contexts where a value was provided during that window.
 */
export const CONTEXT_WINDOWS: Context<unknown>[][] = [[]];

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
