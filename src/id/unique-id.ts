import type { Component } from "../core/types.js";
import { NEXT_ID } from "./internals.js";

/**
 * Allocate an ID that is unique in the current thread.
 *
 * @returns The unique id in the form `rvx_123`.
 */
export function uniqueId(): string {
	const next = NEXT_ID.value;
	if (typeof next === "number" && next >= Number.MAX_SAFE_INTEGER) {
		NEXT_ID.value = BigInt(NEXT_ID.value) + 1n;
	} else {
		NEXT_ID.value++;
	}
	return "rvx_" + String(next);
}

/**
 * A component that provides a unique id in the form `rvx_123` to it's children.
 *
 * See {@link UseUniqueId `<UseUniqueId>`} when using JSX.
 *
 * @example
 * ```tsx
 * import { useUniqueId, e } from "rvx";
 *
 * useUniqueId(id => [
 *   e("label").set("for", id).append("Text"),
 *   e("input").set("type", "text").set("id", id),
 * ])
 * ```
 */
export function useUniqueId<T = unknown>(component: Component<string, T>): T {
	return component(uniqueId());
}

/**
 * A component that provides a unique id in the form `rvx_123` to it's children.
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
export function UseUniqueId(props: {
	children: Component<string>;
}): unknown {
	return props.children(uniqueId());
}
