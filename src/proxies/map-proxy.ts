import { CollectionLike } from "../collection-like";
import { CollectionPatch } from "../collection-patch";
import { Observable } from "../observable";
import { Observer } from "../observer";
import { DecaySequence } from "./decay-sequence";

const TARGET = Symbol("target");
const INDEXES = Symbol("indexes");

export class MapProxy<K, V> extends Observable<CollectionPatch<[K, V]>> implements CollectionLike<[K, V]>, Map<K, V> {
	public constructor(target: Map<K, V> = new Map()) {
		super();
		this[TARGET] = target;
		this[INDEXES] = new DecaySequence(target.keys());
		return new Proxy(this, {
			getPrototypeOf() {
				return Map.prototype;
			}
		});
	}

	private readonly [TARGET]: Map<K, V>;
	private readonly [INDEXES]: DecaySequence<K>;

	protected each(observer: Partial<Observer<CollectionPatch<[K, V]>>>) {
		if (observer.resolve) {
			observer.resolve({ start: 0, count: 0, items: Array.from(this[TARGET]) });
		}
	}

	public getItems(): Iterable<[K, V]> {
		return this[TARGET];
	}

	public clear() {
		const count = this[TARGET].size;
		if (count !== 0) {
			this[TARGET].clear();
			this.notifyResolve({ start: 0, count, items: [] });
		}
	}

	public set(key: K, value: V) {
		if (this[TARGET].has(key)) {
			const index = this[INDEXES].get(key);
			this[TARGET].set(key, value);
			this.notifyResolve({ start: index, count: 1, items: [[key, value]] });
		} else {
			const index = this[INDEXES].append(key);
			this[TARGET].set(key, value);
			this.notifyResolve({ start: index, count: 0, items: [[key, value]] });
		}
		return this;
	}

	public delete(key: K) {
		const deleted = this[TARGET].delete(key);
		if (deleted) {
			const index = this[INDEXES].delete(key);
			if (index !== undefined) {
				this.notifyResolve({ start: index, count: 1, items: [] });
			}
		}
		return deleted;
	}

	public forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any) {
		return this[TARGET].forEach(cb, thisArg);
	}

	public has(key: K) {
		return this[TARGET].has(key);
	}

	public get(key: K) {
		return this[TARGET].get(key);
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
