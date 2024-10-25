
const ACTIVE: Context<unknown>[] = [];
let SNAPSHOT = 0;

const _entry: ContextEntry = <T>(fn: () => T) => fn();

/**
 * A function to enter another context.
 *
 * @param fn The function to run in the other context.
 */
export type ContextEntry = <R>(fn: () => R) => R;

/**
 * A context for implicitly passing values down the call stack.
 */
export class Context<T> {
	#stack: (T | undefined)[] = [];
	#snapshot = 0;

	/**
	 * Get the current value of this context.
	 */
	get current(): T | undefined {
		if (SNAPSHOT === this.#snapshot) {
			const stack = this.#stack;
			return stack[stack.length - 1];
		}
	}

	/**
	 * Run a function with the specified value for this context.
	 */
	inject<R>(value: T | undefined, fn: () => R): R {
		const stack = this.#stack;
		const outer = this.#snapshot;
		try {
			ACTIVE.push(this);
			stack.push(value);
			this.#snapshot = SNAPSHOT;
			return fn();
		} finally {
			this.#snapshot = outer;
			stack.pop();
			ACTIVE.pop();
		}
	}

	/**
	 * Capture a snapshot of the current context for entering that context somewhere else.
	 *
	 * @returns A function to enter the captured context.
	 */
	static capture(): ContextEntry;

	/**
	 * Capture a snapshot of the current context and wrap the specified function to always run in that context.
	 *
	 * @param fn The function to wrap.
	 * @returns The wrapped function.
	 */
	static capture<F extends (...args: any) => any>(fn: F): F;

	static capture(fn: (...args: any) => any = _entry): (...args: any) => any {
		const snapshots = ACTIVE.map<Snapshot<unknown>>(c => ({ c, v: c.current }));
		return (...args) => {
			try {
				for (let i = 0; i < snapshots.length; i++) {
					const snapshot = snapshots[i];
					snapshot.c.#snapshot++;
					snapshot.c.#stack.push(snapshot.v);
				}
				SNAPSHOT++;
				return fn(...args);
			} finally {
				SNAPSHOT--;
				for (let i = 0; i < snapshots.length; i++) {
					const snapshot = snapshots[i];
					snapshot.c.#snapshot--;
					snapshots[i].c.#stack.pop();
				}
			}
		};
	}
}

interface Snapshot<T> {
	c: Context<T>;
	v: T;
}
