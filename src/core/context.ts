
/**
 * Stack of context windows.
 *
 * Each context window is a stack of contexts where a value was provided during that window.
 */
const WINDOWS: Context<unknown>[][] = [[]];

/**
 * Internal function to capture the current state of the specified context.
 */
const _capture = <T>(context: Context<T>): ContextState<T> => {
	return {
		context: context,
		value: context.current,
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
		if (this.#windowId === WINDOWS.length) {
			const stack = this.#stack;
			return stack[stack.length - 1] ?? this.default;
		}
		return this.default;
	}

	/**
	 * Run a function while injecting the specified value for this context.
	 *
	 * @param value The value to inject.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	inject<F extends (...args: any) => any>(value: T | null | undefined, fn: F, ...args: Parameters<F>): ReturnType<F> {
		const window = WINDOWS[WINDOWS.length - 1];
		const stack = this.#stack;
		const parent = this.#windowId;
		try {
			this.#windowId = WINDOWS.length;
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
		return { context: this, value };
	}

	/**
	 * Run a function in a new context window (ignoring all current contexts) while injecting the specified states.
	 *
	 * @param states The states to inject.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	static window<F extends (...args: any) => any>(states: ContextState<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		try {
			WINDOWS.push([]);
			return Context.inject<F>(states, fn, ...args);
		} finally {
			WINDOWS.pop();
		}
	}

	/**
	 * Run a function while injecting the specified states.
	 *
	 * @param states The states to inject. When providing multiple values for the same context, the last one is used.
	 * @param fn The function to run.
	 * @param args The function arguments.
	 * @returns The function's return value.
	 */
	static inject<F extends (...args: any) => any>(states: ContextState<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		const active: ActiveState<unknown>[] = [];
		const windowId = WINDOWS.length;
		const window = WINDOWS[windowId - 1];
		for (let i = 0; i < states.length; i++) {
			const { context, value } = states[i];
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
		return WINDOWS[WINDOWS.length - 1].map(_capture);
	}

	/**
	 * Capture all current context states and wrap a function to always run with only these states injected.
	 *
	 * @param fn The function to wrap.
	 * @returns The wrapped function.
	 */
	static wrap<T extends (...args: any) => any>(fn: T): T {
		const states = Context.capture();
		return ((...args) => Context.window<any>(states, fn, ...args)) as T;
	}
}

/**
 * @deprecated Use {@link Context} instead.
 */
export const DefaultContext = Context;

interface ActiveState<T> {
	/** The active context. */
	c: Context<T>;
	/** The context window id before this state has been activated. */
	p: number;
}

/**
 * A context-value pair.
 */
export interface ContextState<T> {
	context: Context<T>;

	/**
	 * The value that is injected when using this state with {@link Inject `<Inject>`}, {@link Context.inject} or {@link Context.window}.
	 */
	value: T | null | undefined;
}

/**
 * Component for injecting context values while rendering.
 */
export function Inject<T>(props: {
	/** The context to inject into. */
	context: Context<T>;
	/** The value to inject. */
	value: T | null | undefined;
	children: () => unknown;
} | {
	/** The context states to inject. */
	states: ContextState<unknown>[];
	children: () => unknown;
}): unknown {
	if ("context" in props) {
		return props.context.inject(props.value, props.children);
	}
	return Context.inject(props.states, props.children);
}
