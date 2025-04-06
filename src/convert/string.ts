import { Expression, map } from "../core/signals.js";

/**
 * Map expression values to strings.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { string } from "rvx/convert";
 *
 * <div some-value={string(true)} />; // <div some-value="true" />
 * <div some-value={string(false)} />; // <div some-value="false" />
 * <div some-value={string(null)} />; // <div some-value="null" />
 * ```
 */
export function string(input: Expression<unknown>): Expression<string> {
	return map(input, String);
}
