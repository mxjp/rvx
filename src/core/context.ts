
const WINDOWS: Context<unknown>[][] = [[]];

const _capture = <T>(context: Context<T>): ContextState<T> => {
	return {
		context: context,
		value: context.current,
	};
};

export class Context<T> {
	#stack: (T | undefined)[] = [];
	#windowId = 0;

	get current(): T | undefined {
		if (this.#windowId === WINDOWS.length) {
			const stack = this.#stack;
			return stack[stack.length - 1];
		}
	}

	inject<F extends (...args: any) => any>(value: T | undefined, fn: F, ...args: Parameters<F>): ReturnType<F> {
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

	with(value: T | undefined): ContextState<T> {
		return { context: this, value };
	}

	static window<F extends (...args: any) => any>(states: ContextState<unknown>[], fn: F, ...args: Parameters<F>): ReturnType<F> {
		try {
			WINDOWS.push([]);
			return this.inject<F>(states, fn, ...args);
		} finally {
			WINDOWS.pop();
		}
	}

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
			for (let i = 0; i < active.length; i++) {
				const { c: context, p: parent } = active[i];
				context.#windowId = parent;
				context.#stack.pop();
				window.pop();
			}
		}
	}

	static wrap<T extends (...args: any) => any>(fn: T): T {
		const states = WINDOWS[WINDOWS.length - 1].map(_capture);
		return ((...args) => Context.window<any>(states, fn, ...args)) as T;
	}
}

interface ActiveState<T> {
	c: Context<T>;
	p: number;
}

export interface ContextState<T> {
	context: Context<T>;
	value: T | undefined;
}

export function Inject<T>(props: {
	/** The context to inject into. */
	context: Context<T>;
	/** The value to inject. */
	value: T | undefined;
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
