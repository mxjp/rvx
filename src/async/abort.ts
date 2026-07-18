import { teardown } from "../core/index.js";

/**
 * Create a new abort controller that aborts when the current lifecycle is disposed.
 */
export function useAbortController(reason?: unknown): AbortController {
	const controller = new AbortController();
	teardown(() => controller.abort(reason));
	return controller;
}

/**
 * Get an abort signal that aborts when the current lifecycle is disposed.
 */
export function useAbortSignal(reason?: unknown): AbortSignal {
	return useAbortController(reason).signal;
}
