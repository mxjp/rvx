import { TaskSlot } from "../async/task-slot.js";
import { uncapture } from "../core/lifecycle.js";

const KEY = Symbol.for("rvx:test:task-slots");
const SLOTS: Map<unknown, TaskSlot> = (globalThis as any)[KEY] ?? ((globalThis as any)[KEY] = new Map());

/**
 * Run an exclusive action for a specific purpose.
 *
 * @param key The key to identify the purpose.
 * @param action The action to run.
 */
export function exclusive<T>(key: unknown, action: () => T | Promise<T>): Promise<T> {
	let slot = SLOTS.get(key);
	if (slot === undefined) {
		slot = uncapture(() => new TaskSlot());
		SLOTS.set(key, slot);
	}
	return slot.block(action);
}
