import { uniqueId } from "./unique-id.js";

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
