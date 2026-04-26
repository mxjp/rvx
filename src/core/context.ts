
/**
 * The current context window.
 *
 * Each context window is a stack of contexts where a value was provided within that window.
 */
let WINDOW: ContextWindow = [];

type ContextWindow = Context<unknown>[];

/**
 * Internal function to capture the current state of the specified context.
 */
const _capture = <T>(context: Context<T>): ContextState<T> => {
	return {
		c: context,
		v: context.current,
	};
};

/**
 * A context for implicitly passing values along the call stack.
 *
 * If you need a global default value, use {@link DefaultContext} instead.
 */
export class Context<T> {
	/**
	 * @param defaultValue The default value. This is used if the {@link current} value is `null` or `undefined`.
	 */
	constructor(defaultValue: T);
	constructor(...defaultValue: T extends undefined ? [] : [T]);
	constructor(defaultValue?: T) {
		this.default = defaultValue!;
	}

	/**
	 * The currently provided value.
	 */
	#frame: T | null | undefined;

	/**
	 * The innermost context window where a value is currently provided.
	 */
	#window: Context<unknown>[] | undefined;

	/**
	 * Get or set the default value.
	 *
	 * This is used if the {@link current} value is `null` or `undefined`.
	 */
	default: T;

	/**
	 * Get the current value for this context.
	 */
	get current(): T {
		if (this.#window === WINDOW) {
			return this.#frame ?? this.default;
		}
		return this.default;
	}

	/**
	 * Run a function while providing the specified value for this context.
	 *
	 * See {@link Provide `<Provide>`} when using JSX.
	 *
	 * @param value The value to provide.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	provide<F extends (...args: any) => any>(value: T | null | undefined, fn: F, ...args: Parameters<F>): ReturnType<F> {
		const window = WINDOW;
		const parentValue = this.#frame;
		const parentWindow = this.#window;
		try {
			this.#window = window;
			window.push(this);
			this.#frame = value;
			return fn(...args);
		} finally {
			this.#frame = parentValue;
			window.pop();
			this.#window = parentWindow;
		}
	}

	/**
	 * Shorthand for creating a context-value pair for this context.
	 */
	with(value: T | null | undefined): ContextState<T> {
		return { c: this, v: value };
	}

	/**
	 * Run a function in a new context window (ignoring all current contexts) while providing the specified states.
	 *
	 * @param states The states to provide.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	static isolate<F extends (...args: any) => any>(states: ContextState<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		const parent = WINDOW;
		try {
			WINDOW = [];
			return Context.provide<F>(states, fn, ...args);
		} finally {
			WINDOW = parent;
		}
	}

	/**
	 * Run a function while providing the specified states.
	 *
	 * See {@link Provide `<Provide>`} when using JSX.
	 *
	 * @param states The states to provide. When providing multiple values for the same context, the last one is used.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	static provide<F extends (...args: any) => any>(states: ContextState<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		const active: ActiveState<unknown>[] = [];
		const window = WINDOW;
		for (let i = 0; i < states.length; i++) {
			const { c: context, v: value } = states[i];
			active.push({ c: context, p: context.#window, v: context.#frame });
			context.#window = window;
			context.#frame = value;
			window.push(context);
		}
		try {
			return fn(...args);
		} finally {
			for (let i = active.length - 1; i >= 0; i--) {
				const { c: context, p: parent, v: parentValue } = active[i];
				context.#window = parent;
				context.#frame = parentValue;
				window.pop();
			}
		}
	}

	/**
	 * Capture all current context states.
	 */
	static capture(): ContextState<unknown>[] {
		return WINDOW.map(_capture);
	}

	/**
	 * Bind a function to the current context.
	 *
	 * @param fn The function to bind.
	 * @returns The bound function.
	 */
	static bind<T extends (...args: any) => any>(fn: T): T {
		const states = Context.capture();
		return ((...args) => Context.isolate<any>(states, fn, ...args)) as T;
	}
}

interface ActiveState<T> {
	/** The active context. */
	c: Context<T>;
	/** The parent context window. */
	p: ContextWindow | undefined;
	/** The parent value. */
	v: T | null | undefined;
}

/**
 * A context-value pair.
 *
 * Fields are considered internal and not subject to semantic versioning.
 */
export interface ContextState<T> {
	c: Context<T>;
	v: T | null | undefined;
}
