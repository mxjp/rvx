import { type TeardownHook } from "../lifecycle.js";

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
export interface TeardownFrame {
	push(hook: TeardownHook): void;
}

/**
 * A stack where the last item may be an array which teardown hooks are captured in.
 */
export const TEARDOWN_STACK: (TeardownFrame | undefined)[] = [];
