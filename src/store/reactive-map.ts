import { $, batch, Signal } from "../core/signals.js";
import type { Barrier } from "./barrier.js";
import { ProbeMap } from "./probes.js";

/**
 * A reactive wrapper for a map.
 */
export class ReactiveMap<K, V> extends Map<K, V> {
	#target: Map<K, V>;
	#barrier: Barrier;
	#size: Signal<number>;
	#iterators: Signal<void>;
	#getProbes: ProbeMap<K, V | undefined>;
	#hasProbes: ProbeMap<K, boolean>;

	/**
	 * Create a new wrapper.
	 *
	 * @param target The target.
	 * @param barrier The barrier to convert values. Keys are not reactive.
	 */
	constructor(target: Map<K, V>, barrier: Barrier) {
		super();
		this.#target = target;
		this.#barrier = barrier;
		this.#size = $(target.size);
		this.#iterators = $();
		this.#getProbes = new ProbeMap(key => target.get(key));
		this.#hasProbes = new ProbeMap(key => target.has(key));
	}

	get size(): number {
		this.#size.access();
		return this.#target.size;
	}

	get(key: K): V | undefined {
		this.#getProbes.access(key);
		return this.#barrier.wrap(this.#target.get(key));
	}

	has(key: K): boolean {
		this.#hasProbes.access(key);
		return this.#target.has(key);
	}

	set(key: K, value: V): this {
		batch(() => {
			value = this.#barrier.unwrap(value);
			this.#target.set(key, value);
			this.#size.value = this.#target.size;
			this.#iterators.notify();
			this.#getProbes.update(key, value);
			this.#hasProbes.update(key, true);
		});
		return this;
	}

	delete(key: K): boolean {
		return batch(() => {
			const deleted = this.#target.delete(key);
			if (deleted) {
				this.#size.value = this.#target.size;
				this.#iterators.notify();
				this.#getProbes.update(key, undefined);
				this.#hasProbes.update(key, false);
			}
			return deleted;
		});
	}

	clear(): void {
		batch(() => {
			this.#target.clear();
			this.#size.value = 0;
			this.#iterators.notify();
			this.#getProbes.fill(undefined);
			this.#hasProbes.fill(false);
		});
	}

	* entries(): MapIterator<[K, V]> {
		this.#iterators.access();
		for (const entry of this.#target.entries()) {
			yield [entry[0], this.#barrier.wrap(entry[1])];
		}
	}

	keys(): MapIterator<K> {
		this.#iterators.access();
		return this.#target.keys();
	}

	* values(): MapIterator<V> {
		this.#iterators.access();
		for (const entry of this.#target.values()) {
			yield this.#barrier.wrap(entry);
		}
	}

	forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
		this.#iterators.access();
		return this.#target.forEach((value, key) => callback.call(thisArg, this.#barrier.wrap(value), key, this));
	}

	* [Symbol.iterator](): MapIterator<[K, V]> {
		this.#iterators.access();
		for (const entry of this.#target.entries()) {
			yield [entry[0], this.#barrier.wrap(entry[1])];
		}
	}

	get [Symbol.toStringTag](): string {
		return this.#target[Symbol.toStringTag];
	}
}
