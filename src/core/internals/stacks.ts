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

export const LEAK: TeardownFrame = {
	push(hook) {
		LEAK_HOOK?.(hook);
	},
};

/**
 * A stack where the last item may be an object which teardown hooks are captured in.
 *
 * `undefined` indicates that hooks are intentionally not captured.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [LEAK];

let LEAK_HOOK: LeakHook | undefined = undefined;

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

export type LeakHook = (hook: TeardownHook) => void;

/**
 * Register a hook to be called when any teardown hooks are registered outside of any capture calls.
 *
 * Errors thrown from the leak hook will be thrown by the **teardown** calls.
 */
export function onLeak(hook: LeakHook): void {
	if (LEAK_HOOK !== undefined) {
		// onLeak must only be called once and outside of any capture calls:
		throw new Error("G4");
	}
	LEAK_HOOK = hook;
}

export function getLeakHook(): LeakHook | undefined {
	return LEAK_HOOK;
}

export function setLeakHook(hook: LeakHook | undefined): void {
	LEAK_HOOK = hook;
}
