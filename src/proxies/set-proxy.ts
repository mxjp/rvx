import { CollectionLike } from "../collection-like";
import { CollectionPatch } from "../collection-patch";
import { Observable } from "../observable";
import { Observer } from "../observer";
import { DecaySequence } from "./decay-sequence";

const TARGET = Symbol("target");
const INDEXES = Symbol("indexes");
const ENTRY_OBSERVERS = Symbol("entryObservers");

export class SetProxy<T> extends Observable<CollectionPatch<T>> implements CollectionLike<T>, Set<T> {
	public constructor(target: Set<T> = new Set()) {
		super();
		this[TARGET] = target;
		this[INDEXES] = new DecaySequence(target);
		return new Proxy(this, {
			getPrototypeOf() {
				return Set.prototype;
			}
		});
	}

	private readonly [TARGET]: Set<T>;
	private readonly [INDEXES]: DecaySequence<T>;
	private readonly [ENTRY_OBSERVERS] = new Map<T, Set<Observer<boolean>>>();

	protected each(observer: Partial<Observer<CollectionPatch<T>>>) {
		if (observer.resolve) {
			observer.resolve({ start: 0, count: 0, items: Array.from(this[TARGET]) });
		}
	}

	public getItems(): Iterable<T> {
		return this[TARGET];
	}

	public entry(value: T) {
		return new Observable<boolean>(observer => {
			let observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.add(observer);
			} else {
				this[ENTRY_OBSERVERS].set(value, observers = new Set([observer]));
			}
			return () => {
				observers.delete(observer);
				if (observers.size === 0) {
					this[ENTRY_OBSERVERS].delete(value);
				}
			};
		}, observer => {
			if (observer.resolve) {
				observer.resolve(this[TARGET].has(value));
			}
		});
	}

	public clear() {
		const target = this[TARGET];
		const count = target.size;
		if (count !== 0) {
			const entryObservers = this[ENTRY_OBSERVERS];
			const notifyEntries: Set<Observer<boolean>>[] = [];
			if (entryObservers.size > target.size) {
				for (const value of target) {
					const observers = entryObservers.get(value);
					if (observers) {
						notifyEntries.push(observers);
					}
				}
			} else if (entryObservers.size > 0) {
				for (const [value, observers] of entryObservers) {
					if (target.has(value)) {
						notifyEntries.push(observers);
					}
				}
			}
			target.clear();
			this.notifyResolve({ start: 0, count, items: [] });
			notifyEntries.forEach(os => os.forEach(o => o.resolve(false)));
		}
	}

	public add(value: T) {
		if (!this[TARGET].has(value)) {
			const index = this[INDEXES].append(value);
			this[TARGET].add(value);
			const observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.forEach(o => o.resolve(true));
			}
			this.notifyResolve({ start: index, count: 0, items: [value] });
		}
		return this;
	}

	public delete(value: T) {
		const deleted = this[TARGET].delete(value);
		if (deleted) {
			const index = this[INDEXES].delete(value);
			const observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.forEach(o => o.resolve(false));
			}
			if (index !== undefined) {
				this.notifyResolve({ start: index, count: 1, items: [] });
			}
		}
		return deleted;
	}

	public forEach(cb: (value: T, value2: T, set: Set<T>) => void, thisArg?: any) {
		return this[TARGET].forEach(cb, thisArg);
	}

	public has(value: T) {
		return this[TARGET].has(value);
	}

	public get size() {
		return this[TARGET].size;
	}

	public [Symbol.iterator]() {
		return this[TARGET][Symbol.iterator]();
	}

	public entries() {
		return this[TARGET].entries();
	}

	public keys() {
		return this[TARGET].keys();
	}

	public values() {
		return this[TARGET].values();
	}

	public get [Symbol.toStringTag]() {
		return this[TARGET][Symbol.toStringTag];
	}
}
