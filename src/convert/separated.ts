import { Expression, map } from "../core/signals.js";

/**
 * Map an expression to join array elements using the specified separator.
 *
 * See {@link map}.
 *
 * @param separator The separator to use. Default is a space.
 *
 * @example
 * ```tsx
 * import { separated } from "rvx";
 *
 * <div aria-owns={separated(["a", "b", ...])} />
 * ```
 */
export function separated(input: Expression<unknown[]>, separator?: string): Expression<string>;
export function separated<T>(input: Expression<T>, separator?: string): Expression<T extends any[] ? (Exclude<T, any[]> | string) : T>;
export function separated(input: Expression<unknown[] | unknown>, separator = " "): Expression<unknown> {
	return map(input, v => {
		if (Array.isArray(v)) {
			return v.join(separator);
		}
		return v;
	});
}
