import { type TeardownHook } from "./lifecycle.js";

/**
 * A stack where the last item may be an array which teardown hooks are captured in.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [];

export type Falsy = null | undefined | false | 0 | 0n | "";

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
export interface TeardownFrame {
	push(hook: TeardownHook): void;
}

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
