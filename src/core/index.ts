export * from "./context.js";
export * from "./element-builder.js";
export * from "./element-common.js";
export * from "./env.js";
export * from "./lifecycle.js";
export * from "./signals.js";
export type * from "./types.js";
export * from "./view.js";

import { useMicrotask } from "../async/timers.js";

/**
 * @deprecated Use {@link useMicrotask} instead.
 *
 * Register a function to be called as a microtask.
 *
 * + If the current lifecycle is disposed immediately, the hook is never called.
 * + The lifecycle within the created hook is treated as the current lifecycle.
 *
 * @param hook The hook to queue.
 * @throws An error if teardown hooks are {@link nocapture explicitly un-supported}.
 */
export const created = useMicrotask;
