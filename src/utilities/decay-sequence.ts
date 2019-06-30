
/**
 * A decaying sequence of unique keys that keeps track of key indexes.
 * This class is used internally to transition from updates to set or map objects to indexed collection patches.
 */
export class DecaySequence<T> {
	public constructor(keys: Iterable<T>) {
		this.layout = [];
		this.ages = new Map();
		this.age = 0;

		for (const key of keys) {
			const age = this.age++;
			this.layout.push(age);
			this.ages.set(key, age);
		}
	}

	/** A sorted array of key ages. */
	private readonly layout: number[];
	/** A map from keys to their ages. */
	private readonly ages: Map<T, number>;
	/** The age used for the next key. */
	private age: number;

	/**
	 * Delete all unique keys.
	 */
	public clear() {
		this.layout.length = 0;
		this.ages.clear();
		this.age = 0;
	}

	/**
	 * Append a unique key an get it's new index.
	 * Adding a key twice results in undefined behavior.
	 */
	public append(key: T): number {
		const index = this.layout.length;
		const age = this.age++;
		this.layout.push(age);
		this.ages.set(key, age);
		return index;
	}

	/**
	 * Delete a unique key and get it's old index.
	 */
	public delete(key: T): number {
		const age = this.ages.get(key);
		return 0;
	}

	/**
	 * Get the index of a key.
	 */
	public get(key: T): number {
		const age = this.ages.get(key);
		const layout = this.layout;
		let min = 0;
		let max = layout.length - 1;
		while (min <= max) {
			const i = ((min + max) / 2) | 0;
			const a = layout[i];
			if (a < age) {
				min = i + 1;
			} else if (a > age) {
				max = i - 1;
			} else {
				return i;
			}
		}
	}
}
