export * from "./context.js";
export * from "./element-builder.js";
export * from "./element-common.js";
export * from "./env.js";
export * from "./lifecycle.js";
export * from "./signals.js";
export type * from "./types.js";
export * from "./view.js";

import { useMicrotask } from "../async/timers.js";
import { optionalString as _optionalString } from "../convert/optional-string.js";
import { string as _string } from "../convert/string.js";

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

/**
 * @deprecated Use {@link _string string} from `rvx/convert` instead.
 *
 * Map an expression value to strings.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { string } from "rvx";
 *
 * <div some-value={string(true)} />; // <div some-value="true" />
 * <div some-value={string(false)} />; // <div some-value="false" />
 * <div some-value={string(null)} />; // <div some-value="null" />
 * ```
 */
export const string = _string;

/**
 * @deprecated Use {@link _optionalString optionalString} from `rvx/convert` instead.
 *
 * Map an expression value to strings unless it's null or undefined.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { optionalString } from "rvx";
 *
 * <div some-value={optionalString(false)} />; // <div some-value="false" />
 * <div some-value={optionalString(null)} />; // <div />
 * ```
 */
export const optionalString = _optionalString;
