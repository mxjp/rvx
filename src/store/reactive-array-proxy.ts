import { $, batch, isTracking } from "../core/signals.js";
import type { Barrier } from "./barrier.js";
import { ProbeMap } from "./probes.js";

export function createReactiveArrayProxy<T>(target: T[], barrier: Barrier): T[] {
	const length = $(target.length);
	const indexProbes = new ProbeMap<number, T | undefined>(i => target[i]);
	return new Proxy(target, {
		get(target, prop, recv) {
			if (prop === "length") {
				length.access();
				return target.length;
			}
			const index = asCanonicalIndex(prop);
			if (index !== undefined) {
				indexProbes.access(index);
				return barrier.wrap(target[index]);
			}
			if (Object.prototype.hasOwnProperty.call(replacements, prop)) {
				return replacements[prop as keyof typeof Array.prototype];
			}
			return Reflect.get(target, prop, recv);
		},
		set(target, prop, value: T, recv) {
			if (prop === "length") {
				batch(() => {
					const previous = target.length;
					target.length = value as number;
					for (let i = previous; i >= target.length; i--) {
						indexProbes.update(i, undefined);
					}
					length.value = Number(value);
				});
				return true;
			}
			const index = asCanonicalIndex(prop);
			if (index !== undefined) {
				batch(() => {
					value = barrier.unwrap(value);
					target[index] = value;
					indexProbes.update(index, value as T);
				});
				return true;
			}
			return Reflect.set(target, prop, value, recv);
		},
		has(target, prop) {
			const cIndex = asCanonicalIndex(prop);
			if (cIndex !== undefined) {
				indexProbes.access(cIndex);
				return cIndex in target;
			}
			return Reflect.has(target, prop);
		},
		deleteProperty(target, prop) {
			const index = asCanonicalIndex(prop);
			if (index !== undefined) {
				batch(() => {
					delete target[index];
					indexProbes.update(index, undefined);
				});
				return true;
			}
			return Reflect.deleteProperty(target, prop);
		},
		ownKeys(target) {
			if (isTracking()) {
				length.access();
				for (let i = 0; i < target.length; i++) {
					indexProbes.access(i);
				}
			}
			return Reflect.ownKeys(target);
		},
	}) as T[];
}

const replacements = Object.create(null) as typeof Array.prototype;

for (const key of [
	"copyWithin",
	"fill",
	"pop",
	"push",
	"reverse",
	"shift",
	"sort",
	"splice",
	"unshift",
] as const) {
	replacements[key] = function (...args: unknown[]): any {
		return batch(() => {
			return (Array.prototype[key] as (...args: unknown[]) => unknown).call(this, ...args);
		});
	};
}

/**
 * Try converting an arbitrary value to a non-negative index according to ECMA262 CanonicalNumericIndexString.
 *
 * @param value The value to convert.
 * @returns The index or undefined if the conversion failed.
 */
function asCanonicalIndex(value: unknown): number | undefined {
	if (typeof value === "symbol") {
		return undefined;
	}
	const index = Number(value);
	if (Number.isSafeInteger(index) && index >= 0 && index <= 0xFFFFFFFF) {
		return index;
	}
	return undefined;
}
