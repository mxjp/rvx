import { $, batch } from "../core/signals.js";
import type { Barrier } from "./barrier.js";
import { ProbeMap } from "./probes.js";

/**
 * Create a reactive proxy for an arbitrary object.
 *
 * @param target The target.
 * @param barrier The barrier to convert values.
 * @returns The proxy.
 */
export function createReactiveProxy<T extends object>(target: T, barrier: Barrier): T {
	const iterators = $();
	const getProbes = new ProbeMap<keyof T, T[keyof T]>(key => target[key]);
	const hasProbes = new ProbeMap<keyof T, boolean>(key => key in target);
	const proto = Object.getPrototypeOf(target) as T | null;

	function isReactive(prop: string | symbol): boolean {
		if (proto !== null && prop in proto) {
			return false;
		}
		return true;
	}

	return new Proxy(target, {
		get(target, prop, recv) {
			if (isReactive(prop)) {
				getProbes.access(prop as keyof T);
			}
			return barrier.wrap(Reflect.get(target, prop, recv));
		},
		has(target, prop) {
			if (isReactive(prop)) {
				hasProbes.access(prop as keyof T);
			}
			return Reflect.has(target, prop);
		},
		set(target, prop, value: T[keyof T], recv) {
			value = barrier.unwrap(value);
			if (isReactive(prop)) {
				return batch(() => {
					const ok = Reflect.set(target, prop, value, recv);
					if (ok) {
						iterators.notify();
						getProbes.update(prop as keyof T, value);
						hasProbes.update(prop as keyof T, true);
					}
					return ok;
				});
			}
			return Reflect.set(target, prop, value, recv);
		},
		deleteProperty(target, prop) {
			return batch(() => {
				const ok = Reflect.deleteProperty(target, prop);
				if (ok && isReactive(prop)) {
					iterators.notify();
					getProbes.update(prop as keyof T, undefined!);
					hasProbes.update(prop as keyof T, false);
				}
				return ok;
			});
		},
		ownKeys(target) {
			iterators.access();
			return Reflect.ownKeys(target);
		},
	}) as T;
}
