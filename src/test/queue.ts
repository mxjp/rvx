import { Queue } from "../async/queue.js";
import { uncapture } from "../core/lifecycle.js";

const KEY = Symbol.for("rvx:test:queues");
const QUEUES: Map<unknown, Queue> = (globalThis as any)[KEY] ?? ((globalThis as any)[KEY] = new Map());

/**
 * Run an exclusive action for a specific purpose.
 *
 * @param key The key to identify the purpose.
 * @param action The action to run.
 */
export function exclusive<T>(key: unknown, action: () => T | Promise<T>): Promise<T> {
	let queue = QUEUES.get(key);
	if (queue === undefined) {
		queue = uncapture(() => new Queue());
		QUEUES.set(key, queue);
	}
	return queue.block(action);
}
