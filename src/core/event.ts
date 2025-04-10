import { teardown } from "../core/lifecycle.js";

export interface EventFn<T extends unknown[]> {
	(...args: T): void;
}

export interface Event<T extends unknown[]> {
	/**
	 * Subscribe to this event until the current lifecycle is disposed.
	 */
	(listener: EventFn<T>): void;
}

/**
 * An emitter for a single event type.
 *
 * @example
 * ```tsx
 * import { Emitter } from "rvx/event";
 *
 * const emitter = new Emitter<[address: string, port: number]>();
 *
 * emitter.event((address, port) => {
 *   console.log("Connected:", address, port);
 * });
 *
 * emitter.emit("127.0.0.1", 12345);
 * ```
 */
export class Emitter<T extends unknown[]> {
	#listeners = new Set<EventFn<T>>();

	/**
	 * Subscribe to this event until the current lifecycle is disposed.
	 */
	event: Event<T> = listener => {
		this.#listeners.add(listener);
		teardown(() => this.#listeners.delete(listener));
	};

	/**
	 * Emit this event.
	 *
	 * Note, that listeners will run immediately in the current context.
	 */
	emit(...args: T): void {
		this.#listeners.forEach(fn => fn(...args));
	}
}
