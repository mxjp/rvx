import { capture, teardown, TeardownHook } from "../core/lifecycle.js";

/**
 * The same as {@link queueMicrotask}, but with lifecycle support.
 *
 * + If the current lifecycle is disposed, the callback is never called.
 * + The lifecycle within the callback is treated as the current lifecycle.
 *
 * @param callback The callback to run as a microtask.
 * @throws An error if teardown hooks are explicitly un-supported in this context.
 */
export function useMicrotask(callback: () => void): void {
	let active = true;
	let dispose: TeardownHook | undefined;
	teardown(() => {
		active = false;
		dispose?.();
	});
	queueMicrotask(() => {
		if (active) {
			dispose = capture(callback);
			if (!active) {
				dispose?.();
			}
		}
	});
}

/**
 * The same as {@link setTimeout}, but with lifecycle support.
 *
 * + If the current lifecycle is disposed, the timeout is {@link clearTimeout cleared}.
 * + The lifecycle within the callback is treated as the current lifecycle.
 *
 * @param callback The callback to run.
 * @param timeout The timeout in milliseconds. See {@link setTimeout} for details.
 * @throws An error if teardown hooks are explicitly un-supported in this context.
 */
export function useTimeout(callback: () => void, timeout: number): void {
	let active = true;
	let dispose: TeardownHook | undefined;
	let handle: undefined | number | NodeJS.Timeout;
	teardown(() => {
		active = false;
		clearTimeout(handle);
		dispose?.();
	});
	handle = setTimeout(() => {
		dispose = capture(callback);
		if (!active) {
			dispose();
		}
	}, timeout);
}

/**
 * The same as {@link setInterval}, but with lifecycle support.
 *
 * + If the current lifecycle is disposed, the interval is {@link clearInterval cleared}.
 * + The lifecycle within the callback is disposed when the interval is cleared and before each call.
 *
 * @param callback The callback to run.
 * @param interval The interval in milliseconds. See {@link setInterval} for details.
 * @throws An error if teardown hooks are explicitly un-supported in this context.
 */
export function useInterval(callback: () => void, interval: number): void {
	let active = true;
	let dispose: TeardownHook | undefined;
	let handle: undefined | number | NodeJS.Timeout;
	teardown(() => {
		active = false;
		clearInterval(handle);
		dispose?.();
	});
	handle = setInterval(() => {
		dispose?.();
		dispose = undefined;
		dispose = capture(callback);
		if (!active) {
			dispose();
		}
	}, interval);
}
