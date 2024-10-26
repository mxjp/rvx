
const ACTIVE: Context<unknown>[] = [];
let SNAPSHOT = 0;

const _snapshot = <T>(context: Context<T>): ContextSnapshot<T> => {
	return {
		context: context,
		value: context.current,
	};
};

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
	 * Create a snapshot of this context using the specified value.
	 */
	with(value: T | undefined): ContextSnapshot<T> {
		return { context: this, value };
	}

	static enter<F extends (...args: any) => any>(snapshots: ContextSnapshot<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		try {
			for (let i = 0; i < snapshots.length; i++) {
				const snapshot = snapshots[i];
				snapshot.context.#snapshot++;
				snapshot.context.#stack.push(snapshot.value);
			}
			SNAPSHOT++;
			return fn(...args);
		} finally {
			SNAPSHOT--;
			for (let i = 0; i < snapshots.length; i++) {
				const snapshot = snapshots[i];
				snapshot.context.#snapshot--;
				snapshots[i].context.#stack.pop();
			}
		}
	};

	/**
	 * Capture a snapshot of the current context for entering that context somewhere else.
	 *
	 * @returns A function to enter the captured context.
	 */
	static capture(): ContextSnapshot<unknown>[] {
		return ACTIVE.map<ContextSnapshot<unknown>>(_snapshot);
	}

	/**
	 * Capture a snapshot of the current context and wrap the specified function to always run in that context.
	 *
	 * @param fn The function to wrap.
	 * @returns The wrapped function.
	 */
	static wrap<T extends (...args: any) => any>(fn: T): T {
		const snapshots = ACTIVE.map<ContextSnapshot<unknown>>(_snapshot);
		return ((...args) => this.enter<any>(snapshots, fn, ...args)) as T;
	}
}

export interface ContextSnapshot<T> {
	readonly context: Context<T>;
	readonly value: T | undefined;
}

export function Inject<T>(props: {
	context: Context<T>;
	value: T | undefined;
	children: () => unknown;
}): unknown {
	return props.context.inject(props.value, props.children);
}

export function Enter<T>(props: {
	context: ContextSnapshot<unknown>[];
	children: () => unknown;
}): unknown {
	return Context.enter(props.context, props.children);
}
