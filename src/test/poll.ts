import type { Falsy } from "../core/types.js";

export interface PollFn<T> {
	(abort: AbortSignal): T | Falsy | Promise<T | Falsy>;
}

export class PollTimeoutError extends Error {}

/**
 * Repeatedly call a function until a truthy value is returned.
 *
 * + The function is called at most every event cycle.
 * + If a timeout occurs, a {@link PollTimeoutError} is thrown and the abort signal passed to the function is aborted with the same error.
 *
 * @param fn The function to run.
 * @param timeout An optional timeout.
 * @returns The first truthy value.
 */
export async function poll<T>(fn: PollFn<T>, timeout?: number): Promise<T> {
	const ac = new AbortController();
	let timer: undefined | number | NodeJS.Timeout;
	if (timeout !== undefined) {
		timer = setTimeout(() => ac.abort(new PollTimeoutError()), timeout);
	}
	try {
		for (;;) {
			const value = await fn(ac.signal);
			if (value) {
				return value as T;
			}
			ac.signal.throwIfAborted();
			await new Promise<void>(r => setTimeout(r, 0));
		}
	} finally {
		clearTimeout(timer);
	}
}
