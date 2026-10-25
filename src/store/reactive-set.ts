import { $, $v, Signal, Versioned } from "../core/index.js";
import type { Barrier } from "./barrier.js";
import { ProbeMap } from "./probes.js";

/**
 * A reactive wrapper for a set.
 */
export class ReactiveSet<T> implements Set<T> {
	static {
		Object.setPrototypeOf(this.prototype, Set.prototype);
	}

	#target: Set<T>;
	#barrier: Barrier;
	#size: Signal<number>;
	#iterators: Versioned<void>;
	#probes: ProbeMap<T, boolean>;

	/**
	 * Create a new wrapper.
	 *
	 * @param target The target.
	 * @param barrier The barrier to convert values.
	 */
	constructor(target: Set<T>, barrier: Barrier) {
		this.#target = target;
		this.#barrier = barrier;
		this.#size = $(target.size);
		this.#iterators = $v();
		this.#probes = new ProbeMap(key => target.has(key));
	}

	get size(): number {
		this.#size.access();
		return this.#target.size;
	}

	has(value: T): boolean {
		value = this.#barrier.unwrap(value);
		this.#probes.access(value);
		return this.#target.has(value);
	}

	add(value: T): this {
		value = this.#barrier.unwrap(value);
		this.#target.add(value);
		this.#size.value = this.#target.size;
		this.#iterators.notify();
		this.#probes.update(value, true);
		return this;
	}

	delete(value: T): boolean {
		value = this.#barrier.unwrap(value);
		const deleted = this.#target.delete(value);
		if (deleted) {
			this.#size.value = this.#target.size;
			this.#iterators.notify();
			this.#probes.update(value, false);
		}
		return deleted;
	}

	clear(): void {
		this.#target.clear();
		this.#size.value = 0;
		this.#iterators.notify();
		this.#probes.fill(false);
	}

	difference<U>(other: ReadonlySetLike<U>): Set<T> {
		this.#iterators.access();
		return this.#target.difference(other);
	}

	intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
		this.#iterators.access();
		return this.#target.intersection(other);
	}

	isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
		this.#iterators.access();
		return this.#target.isDisjointFrom(other);
	}

	isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
		this.#iterators.access();
		return this.#target.isSubsetOf(other);
	}

	isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
		this.#iterators.access();
		return this.#target.isSupersetOf(other);
	}

	symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
		this.#iterators.access();
		return this.#target.symmetricDifference(other);
	}

	union<U>(other: ReadonlySetLike<U>): Set<T | U> {
		this.#iterators.access();
		return this.#target.union(other);
	}

	* entries(): SetIterator<[T, T]> {
		this.#iterators.access();
		for (const entry of this.#target.entries()) {
			const value = this.#barrier.wrap(entry[0]);
			yield [value, value];
		}
	}

	* keys(): SetIterator<T> {
		this.#iterators.access();
		for (const key of this.#target.keys()) {
			yield this.#barrier.wrap(key);
		}
	}

	* values(): SetIterator<T> {
		this.#iterators.access();
		for (const value of this.#target.values()) {
			yield this.#barrier.wrap(value);
		}
	}

	forEach(callback: (value: T, value2: T, set: Set<T>) => void, thisArg?: unknown): void {
		this.#iterators.access();
		return this.#target.forEach(value => {
			value = this.#barrier.wrap(value);
			callback.call(thisArg, value, value, this);
		});
	}

	* [Symbol.iterator](): SetIterator<T> {
		this.#iterators.access();
		for (const value of this.#target) {
			yield this.#barrier.wrap(value);
		}
	}

	get [Symbol.toStringTag](): string {
		return this.#target[Symbol.toStringTag];
	}
}
