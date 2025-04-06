import { Expression, map } from "../core/signals.js";

/**w
 * Map expression values to strings except `null` or `undefined`.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { optionalString } from "rvx";
 *
 * <div some-value={optionalString(false)} />; // <div some-value="false" />
 * <div some-value={optionalString(null)} />; // <div />
 * <div some-value={optionalString(undefined)} />; // <div />
 * ```
 */
export function optionalString<T>(input: Expression<T>): Expression<string | Exclude<T, Exclude<T, null | undefined>>> {
	return map<T, unknown>(input, value => {
		if (value === null || value === undefined) {
			return value;
		}
		return String(value);
	}) as Expression<string | Exclude<T, Exclude<T, null | undefined>>>;
}
