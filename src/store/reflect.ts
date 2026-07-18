import { $, Signal, watchUpdates } from "../core/index.js";

/**
 * Create a signal that reflects a property of an arbitrary object.
 *
 * @param target The target object.
 * @param key The property key.
 * @returns The signal.
 */
export function reflect<T, K extends keyof T>(target: T, key: K): Signal<T[K]> {
	const prop = $(watchUpdates(() => target[key], value => prop.value = value));
	watchUpdates(prop, value => target[key] = value);
	return prop;
}
