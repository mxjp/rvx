import { CONTEXT_WINDOWS } from "./internals/stacks.js";

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
	 * The stack of provided values.
	 */
	#stack: (T | null | undefined)[] = [];

	/**
	 * The innermost context window id (index in the context window stack) in which a value has been provided.
	 *
	 * Provided values are ignored if this mismatches the current context window.
	 */
	#windowId = 0;

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
		if (this.#windowId === CONTEXT_WINDOWS.length) {
			const stack = this.#stack;
			return stack[stack.length - 1] ?? this.default;
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
		const window = CONTEXT_WINDOWS[CONTEXT_WINDOWS.length - 1];
		const stack = this.#stack;
		const parent = this.#windowId;
		try {
			this.#windowId = CONTEXT_WINDOWS.length;
			window.push(this);
			stack.push(value);
			return fn(...args);
		} finally {
			stack.pop();
			window.pop();
			this.#windowId = parent;
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
		try {
			CONTEXT_WINDOWS.push([]);
			return Context.provide<F>(states, fn, ...args);
		} finally {
			CONTEXT_WINDOWS.pop();
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
		const windowId = CONTEXT_WINDOWS.length;
		const window = CONTEXT_WINDOWS[windowId - 1];
		for (let i = 0; i < states.length; i++) {
			const { c: context, v: value } = states[i];
			active.push({ c: context, p: context.#windowId });
			context.#windowId = windowId;
			context.#stack.push(value);
			window.push(context);
		}
		try {
			return fn(...args);
		} finally {
			for (let i = active.length - 1; i >= 0; i--) {
				const { c: context, p: parent } = active[i];
				context.#windowId = parent;
				context.#stack.pop();
				window.pop();
			}
		}
	}

	/**
	 * Capture all current context states.
	 */
	static capture(): ContextState<unknown>[] {
		return CONTEXT_WINDOWS[CONTEXT_WINDOWS.length - 1].map(_capture);
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
	/** The context window id before this state has been activated. */
	p: number;
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
