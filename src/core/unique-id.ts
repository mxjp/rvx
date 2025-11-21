import type { Component, Content } from "../core/types.js";
import { NEXT_ID } from "./internals/next-unique-id.js";

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
export function useUniqueId<T = Content>(component: Component<string, T>): T {
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
export function UseUniqueId<T = Content>(props: {
	children: Component<string, T>;
}): T {
	return props.children(uniqueId());
}

const IDS = new WeakMap();

/**
 * Get a {@link uniqueId unique id} for the specified object.
 *
 * @param target The target object.
 * @returns The id. This is always the same id for the same object.
 */
export function uniqueIdFor(target: object): string {
	let id = IDS.get(target);
	if (id === undefined) {
		id = uniqueId();
		IDS.set(target, id);
	}
	return id;
}
