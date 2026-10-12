import { NOOP } from "./internals/noop.js";

/**
 * A function that is called to dispose something.
 */
export type TeardownHook = () => void;

/**
 * A function to check if two values are considered equal.
 */
export type EqualsFn<T> = (prev: T, next: T) => boolean;

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
interface TeardownFrame {
	push(hook: TeardownHook): void;
}

export interface Effect {
	(): void;
}

/**
 * Represents something that can produce a value that changes over time.
 */
interface Observable<T> {
	/** The equals function for values produced by this observable. */
	e: EqualsFn<T>;
	/** Subscribe to this observable. */
	s(effect: Effect): void;
	/** Unsubscribe from this observable. */
	u(effect: Effect): void;
	/** Get the latest or produce an updated value of needed. */
	p(): T;
}

/**
 * Represents a dependency used in a computation.
 */
interface Dependency<T> {
	/** The target observable. */
	o: Observable<T>;
	/** The latest used value. */
	v: T;
}

/**
 * A function that is called by an observable when accessed.
 */
interface AccessFrame {
	(observable: Observable<any>): void;
}

const THROW_ON_LEAK: TeardownFrame = {
	push(_hook) {
		// Teardown hooks can not be registered outside of a lifecycle context.
		throw new Error("G5");
	},
};

const LEAK: TeardownFrame = {
	push() {},
};

/**
 * The current frame for capturing teardown hooks.
 */
let TEARDOWN_FRAME: TeardownFrame = THROW_ON_LEAK;

/**
 * The current access tracking frame.
 */
let ACCESS_FRAME: AccessFrame | undefined;

/**
 * Queue of effects to dispatch starting at {@link QUEUE_OFFSET}.
 */
const QUEUE: Effect[] = [];
let QUEUE_OFFSET = 0;

/**
 * True to indicate that a dispatch microtask has been scheduled.
 */
let SCHEDULED = false;

/**
 * Internal utility to dispose the specified hooks in reverse order.
 */
function unwind(hooks: TeardownHook[]) {
	for (let i = hooks.length - 1; i >= 0; i--) {
		hooks[i]();
	}
}

/**
 * Run a function while capturing teardown hooks.
 *
 * + If an error is thrown by the specified function, teardown hooks are called in reverse registration order and the error is re-thrown.
 * + If an error is thrown by a teardown hook, remaining ones are not called and the error is re-thrown.
 *
 * @param fn The function to run.
 * @returns A function to run all captured teardown hooks in reverse registration order.
 */
export function capture(fn: () => void): TeardownHook {
	const parent = TEARDOWN_FRAME;
	const hooks: TeardownHook[] = [];
	try {
		TEARDOWN_FRAME = hooks;
		fn();
	} catch (error) {
		isolate(unwind, hooks);
		throw error;
	} finally {
		TEARDOWN_FRAME = parent;
	}
	return hooks.length === 0 ? NOOP : () => isolate(unwind, hooks);
}

/**
 * Run a function while capturing teardown hooks.
 *
 * + When disposed before the specified function finishes, teardown hooks are called in reverse registration order immediately after the function finishes.
 * + If an error is thrown by the specified function, teardown hooks are called in reverse registration order and the error is re-thrown.
 * + If an error is thrown by a teardown hook, remaining ones are not called and the error is re-thrown.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function captureSelf<T>(fn: (dispose: TeardownHook) => T): T {
	let disposed = false;
	let dispose: TeardownHook = NOOP;
	let value: T;
	dispose = capture(() => {
		value = fn(() => {
			disposed = true;
			dispose();
		});
	});
	if (disposed) {
		dispose();
	}
	return value!;
}

/**
 * Run a function while intentionally leaking teardown hooks.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function leak<T>(fn: () => T): T {
	const parent = TEARDOWN_FRAME;
	try {
		TEARDOWN_FRAME = LEAK;
		return fn();
	} finally {
		TEARDOWN_FRAME = parent;
	}
}

/**
 * Run a function and immediately call teardown hooks if it throws an error.
 *
 * + If an error is thrown, teardown hooks are immediately called in reverse registration order and the error is re-thrown.
 * + If no error is thrown, teardown hooks are registered in the outer context.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function teardownOnError<T>(fn: () => T): T {
	let value!: T;
	teardown(capture(() => {
		value = fn();
	}));
	return value;
}

/**
 * Register a teardown hook to be called when the current lifecycle is disposed.
 *
 * This has no effect if teardown hooks are not captured in the current context.
 *
 * @param hook The hook to register. This may be called multiple times.
 */
export function teardown(hook: TeardownHook): void {
	return TEARDOWN_FRAME.push(hook);
}

/**
 * Run a function in isolation from the following side effect causing APIs:
 * + Teardown hooks are leaked. To isolate only teardown hooks, use {@link leak} instead.
 * + Signal accesses are not tracked and the default tracking behavior is restored. To only isolate signal accesses, use {@link untrack} instead.
 *
 * Note, that contexts are not isolated.
 *
 * @param fn The function to run.
 * @param args The function arguments.
 * @returns The function's return value.
 */
export function isolate<F extends (...args: any[]) => any>(fn: F, ...args: Parameters<F>): ReturnType<F> {
	const parentTeardownFrame = TEARDOWN_FRAME;
	const parentAccessFrame = ACCESS_FRAME;
	try {
		TEARDOWN_FRAME = THROW_ON_LEAK;
		ACCESS_FRAME = undefined;
		return fn(...args);
	} finally {
		TEARDOWN_FRAME = parentTeardownFrame;
		ACCESS_FRAME = parentAccessFrame;
	}
}

/**
 * Internal test utility to check if lifecycle & access tracking is isolated in the current context.
 */
export function isIsolated() {
	return TEARDOWN_FRAME === THROW_ON_LEAK && ACCESS_FRAME === undefined;
}

/**
 * Represents a writable value.
 */
export interface Writable<T> {
	/**
	 * Get the current value.
	 */
	(): T;

	/**
	 * Set the current value.
	 *
	 * @example
	 * ```tsx
	 * import { $, watch } from "rvx";
	 *
	 * const count = $(0);
	 *
	 * watch(count, count => {
	 *   console.log("Count:", count);
	 * });
	 *
	 * count.set(count() + 1);
	 * ```
	 */
	set: (next: T) => void;
}

export interface SignalFn<T> extends Writable<T> {
	$: Signal<T>;
}

/**
 * Represents a value that changes over time.
 */
export class Signal<T> {
	inert: T;
	$: SignalFn<T>;
	#effects: Set<Effect>;

	/**
	 * Create a new signal.
	 *
	 * @param value The initial value.1
	 * @param eq A function to check if two values are equal. Default is `Object.is`.
	 */
	constructor(value: T, eq: EqualsFn<T> = Object.is) {
		this.inert = value;

		const effects = this.#effects = new Set<Effect>();
		const self: Observable<T> = {
			e: eq,
			s(effect) {
				effects.add(effect);
			},
			u(effect) {
				effects.delete(effect);
			},
			p: () => this.inert,
		};

		this.$ = (() => {
			ACCESS_FRAME?.(self);
			return this.inert;
		}) as SignalFn<T>;

		this.$.set = (next: T) => {
			const prev = this.inert;
			this.inert = next;
			if (!eq(prev, next)) {
				effects.forEach(e => e());
			}
		};

		this.$.$ = this;
	}

	/**
	 * Check if this signal has any active observers.
	 */
	get active(): boolean {
		return this.#effects.size > 0;
	}
}

/**
 * Create a new signal.
 *
 * @param value The initial value.
 * @param eq A function to check if two values are equal. Default is `Object.is`.
 * @returns The signal.
 */
export function $<T>(value: T, eq?: EqualsFn<T>): SignalFn<T> {
	return new Signal(value, eq).$;
}

/**
 * A value or function to reactively get a value.
 *
 * @example
 * ```tsx
 * import { $, watch } from "rvx";
 *
 * const message = $("Example");
 *
 * // Not reactive:
 * watch(message(), message => {
 *   console.log("A:", message);
 * });
 *
 * // Reactive:
 * watch(message, message => {
 *   console.log("B:", message);
 * });
 *
 * // Reactive:
 * watch(() => message() + ..., message => {
 *   console.log("C:", message);
 * });
 *
 * message.value = "Hello World!";
 * ```
 */
export type Expression<T> = T | (() => T);

/**
 * Utility to get the result type of an expression.
 */
export type ExpressionResult<T> = T extends Expression<infer R> ? R : never;

/**
 * Utility type for expressions that should never be static values.
 *
 * This can be used instead of the {@link Expression} type in places where accepting static values doesn't make sense.
 */
export type Reactive<T> = () => T;

/**
 * Utility type to require `T` to not be reactive.
 */
export type Static<T> = unknown extends T ? never : Exclude<T, Reactive<any>>;

/**
 * Internal utility to unfold potential recursion into a sequence.
 */
const _unfold = (hook: Effect): Effect => {
	let depth = 0;
	return () => {
		if (depth < 2) {
			depth++;
		}
		if (depth === 1) {
			try {
				while (depth > 0) {
					hook();
					depth--;
				}
			} finally {
				depth = 0;
			}
		}
	};
};

export function schedule(effect: Effect) {
	QUEUE.push(effect);
	if (!SCHEDULED) {
		SCHEDULED = true;
		queueMicrotask(dispatch);
	}
}

export function dispatch() {
	SCHEDULED = false;
	let offset = 0;
	while (offset < QUEUE.length) {
		try {
			QUEUE[offset++]();
		} catch (error) {
			void Promise.reject(error);
		}
	}
	QUEUE.length = 0;
	offset = 0;
}

// TODO: docs.
export function watch<T>(expr: Reactive<T>, effect: (value: NoInfer<T>) => void): void;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can call the effect directly.
 */
export function watch<T>(expr: Static<T>, effect: (value: NoInfer<T>) => void): void;

// TODO: docs.
export function watch(expr: () => void): void;
export function watch<T>(expr: Expression<T>, effect: (value: NoInfer<T>) => void): void;
export function watch<T>(expr: Expression<T>, effect?: (value: NoInfer<T>) => void): void {
	if (typeof expr !== "function") {
		effect?.(expr);
		return;
	}

	teardown(() => {
		_unsubscribe(deps, invalidate);
		disposed = true;
		dispose();
	});

	let disposed = false;
	let dispose: TeardownHook = NOOP;
	const deps: Dependency<unknown>[] = [];

	const invalidate = () => schedule(() => {
		if (deps.some(d => !d.o.e(d.v, d.o.p()))) {
			_unsubscribe(deps, invalidate);
			deps.length = 0;
			run();
		}
	});

	const access: AccessFrame = observable => {
		deps.push({
			o: observable,
			v: observable.p(),
		});
	};

	const run = _unfold(() => {
		if (disposed) {
			return;
		}
		dispose();
		dispose = capture(() => {
			const parent = ACCESS_FRAME;
			try {
				ACCESS_FRAME = access;
				const value = (expr as Reactive<T>)();
				ACCESS_FRAME = undefined;
				effect?.(value);
			} finally {
				ACCESS_FRAME = parent;
			}
		});
	});
}

// TODO: docs.
function _unsubscribe(deps: Dependency<unknown>[], effect: Effect) {
	for (let i = 0; i < deps.length; i++) {
		deps[i].o.u(effect);
	}
}

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect A function to call with each subsequent expression result without tracking signal accesses.
 * @returns The first expression result.
 */
export function watchUpdates<T>(expr: Reactive<T>, effect: (value: NoInfer<T>) => void): T;

/**
 * @deprecated
 * This call can be removed because the expression is always static.
 */
export function watchUpdates<T>(expr: Static<T>, effect: (value: NoInfer<T>) => void): T;

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect A function to call with each subsequent expression result without tracking signal accesses.
 * @returns The first expression result.
 */
export function watchUpdates<T>(expr: Expression<T>, effect: (value: NoInfer<T>) => void): T;
export function watchUpdates<T>(expr: Expression<T>, effect: (value: NoInfer<T>) => void): T {
	let first: T;
	let update = false;
	watch(expr, value => {
		if (update) {
			effect(value);
		} else {
			first = value;
			update = true;
		}
	});
	return first!;
}

// TODO: computed

/**
 * {@link get Evaluate an expression} without tracking signal accesses.
 *
 * @param expr The expression to evaluate.
 * @returns The function's return value.
 *
 * @example
 * ```tsx
 * import { $, untrack, watch } from "rvx";
 *
 * const a = $(2);
 * const b = $(3);
 *
 * watch(() => a.value + untrack(b), sum => {
 *   console.log("Sum:", sum);
 * });
 *
 * // This causes an update:
 * a.value = 4;
 *
 * // This has no effect:
 * b.value = 5;
 * ```
 */
export function untrack<T>(expr: Expression<T>): T;
export function untrack<T>(expr: Expression<T>): T {
	const parent = ACCESS_FRAME;
	try {
		ACCESS_FRAME = undefined;
		return get(expr);
	} finally {
		ACCESS_FRAME = parent;
	}
}

/**
 * Check if signal accesses are currently tracked.
 */
export function isTracking(): boolean {
	return ACCESS_FRAME !== undefined;
}

// TODO: trigger

/**
 * Manually evaluate an expression in the current context.
 *
 * This can be used to access reactive and non reactive inputs.
 *
 * @param expr The expression to evaluate.
 * @returns The expression result.
 *
 * @example
 * ```tsx
 * import { $, get } from "rvx";
 *
 * const count = $(42);
 *
 * get(42) // 42
 * get(count) // 42
 * get(() => 42) // 42
 * ```
 */
export function get<T>(expr: Reactive<T>): T;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can use the value directly.
 */
export function get<T>(expr: Static<T>): T;

/**
 * Manually evaluate an expression in the current context.
 *
 * This can be used to access reactive and non reactive inputs.
 *
 * @param expr The expression to evaluate.
 * @returns The expression result.
 *
 * @example
 * ```tsx
 * import { $, get } from "rvx";
 *
 * const count = $(42);
 *
 * get(42) // 42
 * get(count) // 42
 * get(() => 42) // 42
 * ```
 */
export function get<T>(expr: Expression<T>): T;
export function get<T>(expr: Expression<T>): T {
	if (typeof expr === "function") {
		return (expr as () => T)();
	}
	return expr;
}

export type MapFn<I, O> = (input: I) => O;

// TODO: Docs: prefer using computed:

/**
 * Map an expression value while preserving if the expression is static or not.
 *
 * @example
 * ```tsx
 * import { $, map, get } from "rvx";
 *
 * const count = $(42);
 * const doubleCount = map(count, value => value * 2);
 *
 * get(doubleCount) // 84
 * ```
 */
export function map<I, O>(input: Reactive<I>, mapFn: MapFn<NoInfer<I>, O>): Expression<O>;

/**
 * @deprecated
 * This call can be removed because the input is always static. You can call the map function directly.
 */
export function map<I, O>(input: Static<I>, mapFn: MapFn<NoInfer<I>, O>): Expression<O>;

/**
 * Map an expression value while preserving if the expression is static or not.
 *
 * @example
 * ```tsx
 * import { $, map, get } from "rvx";
 *
 * const count = $(42);
 * const doubleCount = map(count, value => value * 2);
 *
 * get(doubleCount) // 84
 * ```
 */
export function map<I, O>(input: Expression<I>, mapFn: MapFn<NoInfer<I>, O>): Expression<O>;
export function map<I, O>(input: Expression<I>, mapFn: MapFn<NoInfer<I>, O>): Expression<O> {
	if (typeof input === "function") {
		return () => mapFn((input as () => I)());
	}
	return mapFn(input);
}
