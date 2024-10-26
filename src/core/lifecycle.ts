import { TEARDOWN_STACK } from "./internals.js";
import { NOOP, TeardownFrame, useStack } from "./internals.js";

/**
 * A function that can be called to dispose something.
 */
export type TeardownHook = () => void;

/**
 * Internal utility to dispose the specified hooks in reverse order.
 */
function dispose(hooks: TeardownHook[]) {
	for (let i = hooks.length - 1; i >= 0; i--) {
		hooks[i]();
	}
}

/**
 * Run a function while capturing teardown hooks.
 *
 * + If an error is thrown by the specified function, teardown hooks are called in reverse registration order and the error is re-thrown.
 * + If an error is thrown by a teardown hook, remaining ones are not called and the error is re-thrown.
 *
 * @param fn The function to run.
 * @returns A function to run all captured teardown hooks in reverse registration order.
 */
export function capture(fn: () => void): TeardownHook {
	const hooks: TeardownHook[] = [];
	try {
		useStack(TEARDOWN_STACK, hooks, fn);
	} catch (error) {
		dispose(hooks);
		throw error;
	}
	return hooks.length > 1
		? () => dispose(hooks)
		: hooks[0] ?? NOOP;
}

/**
 * Run a function while capturing teardown hooks that may dispose itself.
 *
 * + If an error is thrown by the specified function, teardown hooks are called in reverse registration order and the error is re-thrown.
 * + If an error is thrown by a teardown hook, remaining ones are not called and the error is re-thrown.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function captureSelf<T>(fn: (dispose: TeardownHook) => T): T {
	let disposed = false;
	let dispose: TeardownHook | undefined = undefined;
	let value: T;
	dispose = capture(() => {
		value = fn(() => {
			disposed = true;
			dispose?.();
		});
	});
	if (disposed) {
		dispose();
	}
	return value!;
}

/**
 * Run a function without capturing any teardown hooks.
 *
 * This is the opposite of {@link capture}.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function uncapture<T>(fn: () => T): T {
	return useStack(TEARDOWN_STACK, undefined, fn);
}

const NOCAPTURE: TeardownFrame = {
	push() {
		// Teardown hooks are explicitly not supported in this context:
		throw new Error("G0");
	},
};

/**
 * Run a function and explicitly un-support teardown hooks.
 *
 * Teardown hooks are still supported when using {@link capture}, {@link captureSelf} or {@link uncapture} inside of the function.
 *
 * This should be used in places where lifecycle side are never expected.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function nocapture<T>(fn: () => T): T {
	return useStack(TEARDOWN_STACK, NOCAPTURE, fn);
}

/**
 * Run a function within a lifecycle isolation boundary.
 *
 * + If an error is thrown, teardown hooks are immediately called in reverse registration order and the error is re-thrown.
 * + If no error is thrown, teardown hooks are registered in the outer context.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function teardownOnError<T>(fn: () => T): T {
	let value!: T;
	teardown(capture(() => {
		value = fn();
	}));
	return value;
}

/**
 * Register a teardown hook.
 *
 * This has no effect if teardown hooks are not captured in the current context.
 *
 * @param hook The hook to register. This may be called multiple times.
 * @throws An error if teardown hooks are {@link nocapture explicitly un-supported}.
 */
export function teardown(hook: TeardownHook): void {
	TEARDOWN_STACK[TEARDOWN_STACK.length - 1]?.push(hook);
}
