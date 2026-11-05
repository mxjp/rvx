import type { Component, Content } from "./types.js";
import { useUniqueId } from "./unique-id.js";

/**
 * A component that provides a unique id in the form `rvx_123` to its children.
 *
 * See {@link useUniqueId} when not using JSX.
 *
 * @example
 * ```tsx
 * import { UseUniqueId } from "rvx";
 *
 * <UseUniqueId>
 *   {id => <>
 *     <label for={id}>Text</label>
 *     <input type="text" id={id} />
 *   </>}
 * </UseUniqueId>
 * ```
 */
export function UseUniqueId<T = Content>(props: {
	children: Component<string, T>;
}): T {
	return useUniqueId(props.children);
}
