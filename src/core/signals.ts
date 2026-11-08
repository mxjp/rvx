import { Context } from "./context.js";
import { NOOP } from "./internals/noop.js";

/**
 * Represents a stack frame that teardown hooks can be pushed into.
 *
 * Note that this may be an array.
 */
interface TeardownFrame {
	push(hook: TeardownHook): void;
}

interface Effect {
	(): void;
}

/**
 * Represents an internal observable such as a signal or a computed value.
 */
interface Observable<T, S> {
	/** identity */
	e: StateEq<T, S>;
	/** subscribe */
	s(effect: Effect): void;
	/** unsubscribe */
	u(effect: Effect): void;
	/** pull update */
	p(): T;
}

/**
 * Represents an accessed dependency.
 */
interface Dependency<T, S> {
	/** The target observable */
	o: Observable<T, S>;
	/** The last accessed state */
	s: S;
}

const _isStale = <T, S>(dep: Dependency<T, S>) => !dep.o.e.e(dep.s, dep.o.p());

const _toDep = <T, S>(observable: Observable<T, S>): Dependency<T, S> => ({
	o: observable,
	s: observable.e.s(observable.p()),
});

const _isReactive = (expr: Expression<unknown>): boolean => expr instanceof Signal || typeof expr === "function";

/**
 * A function that is called by an observable when accessed.
 */
interface AccessFrame {
	/**
	 * @param observable The observable that is being accessed.
	 */
	(observable: Observable<any, any>): void;
}

const TEARDOWN_FRAME_THROW: TeardownFrame = {
	push(_hook) {
		// Teardown hooks can not be registered outside of a lifecycle context.
		throw new Error("G5");
	},
};

const TEARDOWN_FRAME_LEAK: TeardownFrame = {
	push() {},
};

/**
 * The current frame for capturing teardown hooks.
 */
let TEARDOWN_FRAME: TeardownFrame = TEARDOWN_FRAME_THROW;

/**
 * The current access tracking frame.
 */
let ACCESS_FRAME: AccessFrame | undefined;

/**
 * A function that is called to dispose something.
 */
export type TeardownHook = () => void;

/**
 * Internal utility to dispose the specified hooks in reverse order.
 */
function dispose(hooks: TeardownHook[]) {
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
		isolate(dispose, hooks);
		throw error;
	} finally {
		TEARDOWN_FRAME = parent;
	}
	return hooks.length === 0 ? NOOP : () => isolate(dispose, hooks);
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
		TEARDOWN_FRAME = TEARDOWN_FRAME_LEAK;
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
 * @throws An error if teardown hooks are not captured in the current context. See {@link leak} for intentionally leaking teardown hooks.
 * @param hook The hook to register. This may be called multiple times.
 */
export function teardown(hook: TeardownHook): void {
	TEARDOWN_FRAME.push(hook);
}

/**
 * Run a function in isolation from the following side effect causing APIs:
 * + Teardown hooks can not be registered and cause an error. To isolate only teardown hooks, use {@link leak} instead.
 * + Accesses are not tracked and the default tracking behavior is restored. To only isolate accesses, use {@link untrack} instead.
 *
 * Note that contexts are not isolated.
 *
 * @param fn The function to run.
 * @param args The function arguments.
 * @returns The function's return value.
 */
export function isolate<F extends (...args: any) => any>(fn: F, ...args: Parameters<F>): ReturnType<F> {
	const parentTeardownFrame = TEARDOWN_FRAME;
	const parentAccessFrame = ACCESS_FRAME;
	try {
		TEARDOWN_FRAME = TEARDOWN_FRAME_THROW;
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
	return TEARDOWN_FRAME === TEARDOWN_FRAME_THROW && !ACCESS_FRAME;
}

/**
 * Fields are considered internal and not subject to semantic versioning.
 */
export interface StateEq<T, S> {
	s(value: T): S;
	e(prev: S, next: T): boolean;
}

/**
 * Create a state equality check that uses the previous and next values.
 *
 * @param e A function that returns true if the values are equal.
 */
export function eq<T>(e: (prev: T, next: T) => boolean): StateEq<T, NoInfer<T>> {
	return { s: value => value, e };
}

const OBJECT_IS = eq(Object.is);

/**
 * Represents a value that changes over time.
 */
export class Signal<T> {
	/**
	 * The current value without access tracking or observer notifications when set.
	 */
	inert: T;

	/**
	 * Currently subscribed effects.
	 */
	#effects: Set<Effect>;

	/**
	 * The observable representing this signal.
	 */
	#observable: Observable<T, any>;

	/**
	 * Create a new signal.
	 *
	 * @param value The initial value.
	 * @param eq Defines how two values are checked for equality. See {@link eq}. Default uses `Object.is`.
	 */
	constructor(value: T, eq: StateEq<NoInfer<T>, unknown> = OBJECT_IS) {
		this.inert = value;
		this.#effects = new Set();
		this.#observable = {
			e: eq,
			s: effect => this.#effects.add(effect),
			u: effect => this.#effects.delete(effect),
			p: () => this.inert,
		};
	}

	/**
	 * Reactively access the current value.
	 */
	get value(): T {
		this.access();
		return this.inert;
	}

	/**
	 * Set the current value.
	 *
	 * Observers only re-run when their last known value of this signal has changed.
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
	 * count.value++;
	 * ```
	 */
	set value(value: T) {
		const eq = this.#observable.e;
		if (!eq.e(eq.s(this.inert), value)) {
			this.notify();
		}
		this.inert = value;
	}

	/**
	 * Check if this signal has any active observers.
	 */
	get active(): boolean {
		return this.#effects.size > 0;
	}

	/**
	 * Manually access this signal.
	 */
	access(): void {
		ACCESS_FRAME?.(this.#observable);
	}

	/**
	 * Manually notify observers.
	 *
	 * Note that observers might not re-run if their last known value of this signal is equal to the current one.
	 */
	notify(): void {
		this.#effects.forEach(e => e());
	}

	/**
	 * Pass this signal to a function and get its result.
	 *
	 * @example
	 * ```tsx
	 * const value = $(42);
	 *
	 * <TextInput value={
	 *   value
	 *     .pipe(toString)
	 *     .pipe(trim)
	 * } />
	 * ```
	 */
	pipe<A extends any[], R>(fn: (self: this, ...args: A) => R, ...args: A): R {
		return fn(this, ...args);
	}
}

/**
 * Create a new signal.
 *
 * @param value The initial value.
 * @param eq Defines how two values are checked for equality. See {@link eq}. Default uses `Object.is`.
 */
export function $<T>(value: T, eq?: StateEq<NoInfer<T>, unknown>): Signal<T> {
	return new Signal(value, eq);
}

interface ObjSignalState<T> {
	/** previous value */
	p: T;
	/** version */
	v: symbol;
}

/**
 * A {@link Signal} with a manually versioned state.
 */
export class ObjSignal<T> extends Signal<T> {
	#version = Symbol();

	constructor(value: T) {
		super(value, {
			s: _value => ({ p: _value, v: this.#version }),
			e: (prev, _next) => Object.is(prev.p, _next) && prev.v === this.#version,
		} satisfies StateEq<T, ObjSignalState<T>>);
	}

	/**
	 * Bump the version of this signal & notify observers.
	 */
	notify(): void {
		this.#version = Symbol();
		super.notify();
	}
}

/**
 * Shorthand for creating a {@link ObjSignal versioned signal}.
 *
 * @example
 * ```tsx
 * let value = 0;
 * const signal = $obj();
 *
 * watch(() => {
 *   signal.access();
 *   return value;
 * }, () => {
 *   console.log("Value:", value);
 * });
 *
 * value++;
 * signal.notify();
 * ```
 */
export function $obj(): ObjSignal<void>;

/**
 * Shorthand for creating a {@link ObjSignal versioned signal}.
 *
 * @example
 * ```tsx
 * const map = $obj(new Map());
 * map.inert.set("foo", 1);
 * map.inert.set("bar", 2);
 * map.notify();
 * ```
 */
export function $obj<T>(value: T): ObjSignal<T>;
export function $obj<T>(value?: T): ObjSignal<T> {
	return new ObjSignal(value!);
}

/**
 * A value, signal or function to get a value.
 *
 * @example
 * ```tsx
 * import { $, watch } from "rvx";
 *
 * const message = $("Example");
 *
 * // Not reactive:
 * watch(message.value, message => {
 *   console.log("A:", message);
 * });
 *
 * // Reactive:
 * watch(message, message => {
 *   console.log("B:", message);
 * });
 *
 * // Reactive:
 * watch(() => message.value, message => {
 *   console.log("C:", message);
 * });
 *
 * message.value = "Hello World!";
 * ```
 */
export type Expression<T> = Signal<T> | (() => T) | T;

/**
 * Utility to get the result type of an expression.
 */
export type ExpressionResult<T> = T extends Expression<infer R> ? R : never;

/**
 * Utility type for expressions that should never be static values.
 *
 * This can be used instead of the {@link Expression} type in places where accepting static values doesn't make sense.
 */
export type Reactive<T> = Signal<T> | (() => T);

/**
 * Utility type to require `T` to not be reactive.
 */
export type Static<T> = unknown extends T ? never : Exclude<T, Reactive<any>>;

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * + Both the expression and effect are called at least once immediately.
 * + Lifecycle hooks from the expression or effect are called before a signal update is processed or when the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect An optional effect to call with each expression result without tracking accesses.
 *
 * @example
 * ```tsx
 * import { $, watch } from "rvx";
 *
 * const count = $(0);
 *
 * // Capture teardown hooks registered by "watch":
 * const dispose = capture(() => {
 *   // Start watching:
 *   watch(count, count => {
 *     console.log("Count:", count);
 *   });
 * });
 *
 * count.value = 1;
 *
 * // Stop watching:
 * dispose();
 *
 * count.value = 2;
 * ```
 */
export function watch<T>(expr: Reactive<T>, effect: (value: NoInfer<T>) => void): void;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can call the effect directly.
 */
export function watch<T>(expr: Static<T>, effect: (value: NoInfer<T>) => void): void;

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * + Both the expression and effect are called at least once immediately.
 * + Lifecycle hooks from the expression or effect are called before a signal update is processed or when the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect An optional effect to call with each expression result without tracking accesses.
 *
 * @example
 * ```tsx
 * import { $, watch } from "rvx";
 *
 * const count = $(0);
 *
 * // Capture teardown hooks registered by "watch":
 * const dispose = capture(() => {
 *   // Start watching:
 *   watch(count, count => {
 *     console.log("Count:", count);
 *   });
 * });
 *
 * count.value = 1;
 *
 * // Stop watching:
 * dispose();
 *
 * count.value = 2;
 * ```
 */
export function watch(expr: () => void): void;
export function watch<T>(expr: Expression<T>, effect: (value: NoInfer<T>) => void): void;
export function watch<T>(expr: Expression<T>, effect?: (value: NoInfer<T>) => void): void {
	if (_isReactive(expr)) {
		let disposed = false;
		let dispose: TeardownHook = NOOP;
		const deps: Dependency<unknown, unknown>[] = [];

		const invalidate = () => schedule(() => {
			if (deps.some(_isStale)) {
				unsubscribe();
				run();
			}
		});

		const unsubscribe = () => {
			deps.forEach(d => d.o.u(invalidate));
			deps.length = 0;
		};

		teardown(() => {
			disposed = true;
			dispose();
			unsubscribe();
		});

		const access: AccessFrame = observable => {
			deps.push(_toDep(observable));
			observable.s(invalidate);
		};

		let running = false;
		let stale = false;
		const exec = Context.bind(() => {
			if (!disposed) {
				dispose();
				dispose = capture(() => {
					const parent = ACCESS_FRAME;
					try {
						ACCESS_FRAME = access;
						const value = get(expr);
						ACCESS_FRAME = undefined;
						effect?.(value);
					} finally {
						ACCESS_FRAME = parent;
					}
				});
			}
		});
		const run = () => {
			if (running) {
				stale = true;
				return;
			}
			running = true;
			try {
				do {
					stale = false;
					exec();
				} while (stale);
			} finally {
				running = false;
			}
		};

		run();
	} else {
		effect!(expr as T);
	}
}

const EFFECTS: Effect[] = [];
let EFFECTS_OFFSET = 0;
let EFFECTS_SCHEDULED = false;

function _dispatch(): void {
	while (EFFECTS_OFFSET < EFFECTS.length) {
		try {
			EFFECTS[EFFECTS_OFFSET++]();
		} catch (err) {
			Promise.reject(err);
		}
	}
	EFFECTS.length = 0;
	EFFECTS_OFFSET = 0;
}

export function dispatch(): void {
	isolate(_dispatch);
}

export function schedule(effect: Effect): void {
	EFFECTS.push(effect);
	if (!EFFECTS_SCHEDULED) {
		EFFECTS_SCHEDULED = true;
		queueMicrotask(() => {
			_dispatch();
			EFFECTS_SCHEDULED = false;
		})
	}
}

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect An effect to call with each subsequent expression result without tracking accesses.
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
 * @param effect An effect to call with each subsequent expression result without tracking accesses.
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

/**
 * Wrap an expression to re-run only when any accessed observable has changed.
 *
 * + The {@link Context} from where `computed` was called is available in the expression.
 * + Teardown hooks in the expression are not supported.
 * + The expression only re-runs when the result is accessed after any used observable has changed.
 * + Observers only re-run when the result is not equal to the previous one.
 * + The expression may re-run before an accessing observer while that observer checks if it should re-run.
 *
 * @param expr The expression to wrap.
 * @param eq Defines how two results are checked for equality. See {@link eq}. Default uses `Object.is`.
 * @returns The wrapped expression.
 *
 * @example
 * ```tsx
 * import { $, computed } from "rvx";
 *
 * const a = $(2);
 * const b = $(3);
 *
 * // This computed always returns the sum of the current signal values:
 * const sum = computed(() => a.value + b.value);
 * ```
 */
export function computed<T>(expr: Reactive<T>, eq?: StateEq<NoInfer<T>, any>): () => T;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can replace it with a function that returns the value directly.
 */
export function computed<T>(expr: Static<T>, eq?: StateEq<NoInfer<T>, any>): () => T;

/**
 * Wrap an expression to re-run only when any accessed observable has changed.
 *
 * + The {@link Context} from where `computed` was called is available in the expression.
 * + Teardown hooks in the expression are not supported.
 * + The expression only re-runs when the result is accessed after any used observable has changed.
 * + Observers only re-run when the result is not equal to the previous one.
 * + The expression may re-run before an accessing observer while that observer checks if it should re-run.
 *
 * @param expr The expression to wrap.
 * @param eq Defines how two results are checked for equality. See {@link eq}. Default uses `Object.is`.
 * @returns The wrapped expression.
 *
 * @example
 * ```tsx
 * import { $, computed } from "rvx";
 *
 * const a = $(2);
 * const b = $(3);
 *
 * // This computed always returns the sum of the current signal values:
 * const sum = computed(() => a.value + b.value);
 * ```
 */
export function computed<T>(expr: Expression<T>, eq?: StateEq<NoInfer<T>, any>): () => T;
export function computed<T>(expr: Expression<T>, eq: StateEq<NoInfer<T>, any> = OBJECT_IS): () => T {
	if (!_isReactive(expr)) {
		return () => expr as T;
	}

	const deps: Dependency<unknown, unknown>[] = [];

	let value!: T;
	let stale = true;
	let updating = false;

	const access: AccessFrame = observable => {
		deps.push(_toDep(observable));
	};

	const effects = new Set<Effect>();
	const proxy = () => effects.forEach(e => e());

	const observable: Observable<T, unknown> = {
		e: eq,
		s: effect => {
			const prev = effects.size;
			effects.add(effect);
			if (!prev) {
				deps.forEach(d => d.o.s(proxy));
			}
		},
		u: effect => {
			if (effects.delete(effect) && !effects.size) {
				deps.forEach(d => d.o.u(proxy));
			}
		},
		p: Context.bind(() => {
			if (updating) {
				// Computed value has a circular dependency.
				throw new Error("G6");
			}
			try {
				updating = true;
				if (stale || deps.some(_isStale)) {
					stale = true;
					if (effects.size) {
						deps.forEach(d => d.o.u(proxy));
					}
					deps.length = 0;
					const accessParent = ACCESS_FRAME;
					const teardownParent = TEARDOWN_FRAME;
					try {
						ACCESS_FRAME = access;
						TEARDOWN_FRAME = TEARDOWN_FRAME_THROW;
						value = get(expr);
						stale = false;
					} finally {
						ACCESS_FRAME = accessParent;
						TEARDOWN_FRAME = teardownParent;
						if (effects.size) {
							deps.forEach(d => d.o.s(proxy));
						}
					}
				}
				return value;
			} finally {
				updating = false;
			}
		}),
	};

	return () => {
		const value = observable.p();
		ACCESS_FRAME?.(observable);
		return value;
	};
}

/**
 * Wrap an expression that modifies a value in place to re-run only when any accessed observable has changed.
 *
 * + The {@link Context} from where `computedObj` was called is available in the expression.
 * + Teardown hooks in the expression are not supported.
 * + The expression only re-runs when the result is accessed after any used observable has changed.
 * + Observers only re-run if `update` has been called by the expression since their last access.
 * + The expression may re-run before an accessing observer while that observer checks if it should re-run.
 *
 * @param expr The expression to compute or update the current state. The first argument is a function to call when the computed state has changed.
 * @param value The initial value.
 *
 * @example
 * ```tsx
 * import { $, computedObj } from "rvx";
 *
 * const words = $(["example", "foo", "bar"]);
 *
 * const lengths = computedObj((update, value: number[]) => {
 *   const current = words.value;
 *   let changed = false;
 *   for (let i = 0; i < current.length; i++) {
 *     if (value[i] !== current[i].length) {
 *       value[i] = current[i].length;
 *       changed = true;
 *     }
 *   }
 *   if (value.length !== current.length) {
 *     value.length = current.length;
 *     changed = true;
 *   }
 *   if (changed) {
 *     update(value);
 *   }
 * }, []);
 * ```
 */
export function computedObj<T>(expr: (update: (next: T) => void, value: T) => void, value: T): () => T;
/**
 * Wrap an expression that modifies a value in place to re-run only when any accessed observable has changed.
 *
 * + The {@link Context} from where `computedObj` was called is available in the expression.
 * + Teardown hooks in the expression are not supported.
 * + The expression only re-runs when the result is accessed after any used observable has changed.
 * + Observers only re-run if `update` has been called by the expression since their last access.
 * + The expression may re-run before an accessing observer while that observer checks if it should re-run.
 *
 * @param expr The expression to compute or update the current state. The first argument is a function to call when the computed state has changed.
 * @param value The initial value.
 *
 * @example
 * ```tsx
 * import { $, computedObj } from "rvx";
 *
 * const words = $(["example", "foo", "bar"]);
 *
 * const lengths = computedObj((update, value: number[]) => {
 *   const current = words.value;
 *   let changed = false;
 *   for (let i = 0; i < current.length; i++) {
 *     if (value[i] !== current[i].length) {
 *       value[i] = current[i].length;
 *       changed = true;
 *     }
 *   }
 *   if (value.length !== current.length) {
 *     value.length = current.length;
 *     changed = true;
 *   }
 *   if (changed) {
 *     update(value);
 *   }
 * }, []);
 * ```
 */
export function computedObj<T>(expr: (update: (next: T | undefined) => void, value: T | undefined) => void): () => T | undefined;
export function computedObj<T>(expr: (update: (next: T) => void, value: T) => void, value?: T): () => T {
	let state = value as T;
	let version = Symbol();
	return computed(() => {
		expr(next => {
			state = next;
			version = Symbol();
		}, state);
		return state;
	}, {
		s: () => version,
		e: prev => prev === version,
	});
}

/**
 * {@link get Evaluate an expression} without tracking accesses.
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
export function untrack<T>(expr: Reactive<T>): T;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can use the value directly.
 */
export function untrack<T>(expr: Static<T>): T;

/**
 * {@link get Evaluate an expression} without tracking accesses.
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
 * Check if accesses are currently tracked.
 */
export function isTracking(): boolean {
	return !!ACCESS_FRAME;
}

/**
 * Evaluate an expression while tracking accesses to schedule the trigger effect when any accessed observable has changed.
 *
 * See {@link trigger}.
 */
export interface TriggerPipe {
	<T>(expr: Reactive<T>): T;

	/**
	 * @deprecated
	 * This call can be removed because the expression is always static. You can use the value directly.
	 */
	<T>(expr: Static<T>): T;

	<T>(expr: Expression<T>): T;

	(): void;
}

/**
 * Create a pipe for evaluating expressions that schedules an effect once when any accessed observables from the latest evaluated expression have changed.
 *
 * + The effect only runs when any accessed observable has changed.
 * + When the lifecycle at which the pipe was created is disposed, the effect will not be called anymore.
 * + It is guaranteed that the effect is called before any outer observers like {@link watch} or {@link watchUpdates} are notified.
 * + If pipes are nested, the effect for the most inner one is called first.
 *
 * @param callback The effect to schedule.
 * @returns The pipe to evaluate expressions.
 */
export function trigger(callback: () => void): TriggerPipe {
	const deps: Dependency<unknown, unknown>[] = [];

	const clear = () => {
		deps.forEach(d => d.o.u(effect));
		deps.length = 0;
	};

	teardown(clear);

	const effect: Effect = () => schedule(() => {
		if (deps.some(_isStale)) {
			clear();
			Context.bind(callback)();
		}
	});

	const access: AccessFrame = observable => {
		deps.push(_toDep(observable));
		observable.s(effect);
	};

	return <T>(expr?: Expression<T>) => {
		clear();
		const parent = ACCESS_FRAME;
		try {
			if (!parent) {
				ACCESS_FRAME = access;
			} else {
				ACCESS_FRAME = observable => {
					access(observable);
					parent?.(observable);
				};
			}
			return get(expr);
		} finally {
			ACCESS_FRAME = parent;
		}
	};
}

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
	if (expr instanceof Signal) {
		return expr.value;
	}
	if (typeof expr === "function") {
		return (expr as () => T)();
	}
	return expr;
}

export type MapFn<I, O> = (input: I) => O;

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
	return _isReactive(input) ? () => mapFn(get(input)) : mapFn(input as I);
}
