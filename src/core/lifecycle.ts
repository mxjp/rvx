import { NOOP } from "./internals/noop.js";
import { TEARDOWN_STACK, TeardownFrame } from "./internals/teardown-stack.js";
import { useStack } from "./internals/use-stack.js";

/**
 * A function that is called to dispose something.
 */
export type TeardownHook = () => void;

/**
 * A function that is called after something has been synchronously created. E.g. after rendering a tree of elements.
 */
export type CreatedHook = () => void;

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
	const length = hooks.length;
	return length === 1
		? hooks[0]
		: (length === 0 ? NOOP : () => dispose(hooks));
}

/**
 * Run a function while capturing teardown hooks.
 *
 * + When disposed before the specified function finishes, teardown hooks are called in reverse registration order immediately after the function finishes.
 * + If an error is thrown by the specified function, teardown hooks are called in reverse registration order and the error is re-thrown.
 * + If an error is thrown by a teardown hook, remaining ones are not called and the error is re-thrown.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function captureSelf<T>(fn: (dispose: TeardownHook) => T): T {
	let disposed = false;
	let dispose: TeardownHook = NOOP;
	let value: T;
	dispose = capture(() => {
		value = fn(() => {
			disposed = true;
			dispose();
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
		// Teardown hooks are explicitly not supported in this context and registering them is very likely a mistake:
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
 * Run a function and immediately call teardown hooks if it throws an error.
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
 * Register a teardown hook to be called when the current lifecycle is disposed.
 *
 * This has no effect if teardown hooks are not captured in the current context.
 *
 * @param hook The hook to register. This may be called multiple times.
 * @throws An error if teardown hooks are {@link nocapture explicitly un-supported}.
 */
export function teardown(hook: TeardownHook): void {
	const length = TEARDOWN_STACK.length;
	if (length > 0) {
		TEARDOWN_STACK[length - 1]?.push(hook);
	}
}

/**
 * Register a function to be called as a microtask.
 *
 * + If the current lifecycle is disposed immediately, the hook is never called.
 * + The lifecycle within the created hook is treated as the current lifecycle.
 *
 * @param hook The hook to queue.
 * @throws An error if teardown hooks are {@link nocapture explicitly un-supported}.
 */
export function created(hook: CreatedHook): void {
	let active = true;
	let dispose: TeardownHook | undefined;
	teardown(() => {
		active = false;
		dispose?.();
	});
	queueMicrotask(() => {
		if (active) {
			dispose = capture(hook);
			if (!active) {
				dispose?.();
			}
		}
	});
}
