import { Context } from "./context.js";
import { NOOP } from "./internals/noop.js";
import { ACCESS_STACK, AccessHook, NotifyHook, useStack } from "./internals/stacks.js";
import { isolate } from "./isolate.js";
import { capture, teardown, TeardownHook } from "./lifecycle.js";

/**
 * During a {@link batch}, notify hooks are added to this set instead of being called.
 *
 * Outside of a batch, this is undefined.
 */
let BATCH: Set<NotifyHook> | undefined;

/**
 * Internal function to call the specified hook.
 */
const notify = (fn: NotifyHook) => fn();

/**
 * Internal function to add the specified hook to the current batch.
 */
const queueBatch = (fn: NotifyHook) => BATCH!.add(fn);

/**
 * Represents the source that a signal has been derived from.
 *
 * When deriving a signal, the source should be passed via the signal constructor or shorthand.
 * This has no impact on how a signal behaves, but allows other APIs to locate metadata about a signal's source.
 *
 * @example
 * ```js
 * function trim(source: Signal<string>) {
 *   const input = $(source.value, source);
 *   ...
 *   return input;
 * }
 * ```
 */
export type SignalSource = Signal<unknown> | undefined;

/**
 * Represents a value that changes over time.
 */
export class Signal<T> {
	/**
	 * The current value.
	 */
	#value: T;

	/**
	 * A set of hooks that are called in iteration order by this signal to notify it's observers.
	 *
	 * + This is cleared before hooks are called.
	 * + Observers get a permanent reference to this set to manually add or remove themselves.
	 */
	#hooks = new Set<NotifyHook>();

	/**
	 * The {@link SignalSource source} this signal has been derived from.
	 */
	#source: SignalSource;

	/**
	 * The {@link SignalSource source root}.
	 */
	#root: Signal<unknown>;

	/**
	 * Create a new signal.
	 *
	 * @param value The initial value.
	 * @param source The {@link SignalSource source} this signal has been derived from.
	 */
	constructor(value: T, source?: SignalSource) {
		this.#value = value;
		this.#source = source;
		this.#root = source ? source.#root : this;
	}

	/**
	 * Reactively access the current value.
	 */
	get value(): T {
		this.access();
		return this.#value;
	}

	/**
	 * Set the current value.
	 *
	 * If the new value is the same as the previous one, no observers are notified.
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
		if (!Object.is(this.#value, value)) {
			this.#value = value;
			this.notify();
		}
	}

	/**
	 * The {@link SignalSource source}, this signal has been derived from.
	 */
	get source(): SignalSource {
		return this.#source;
	}

	/**
	 * The root {@link SignalSource source}, this signal has been derived from or this signal itself if it hasn't been derived.
	 */
	get root(): Signal<unknown> {
		return this.#root;
	}

	/**
	 * Update the current value in place.
	 *
	 * @param fn A function to update the value. If false is returned, observers are not notified.
	 *
	 * @example
	 * ```tsx
	 * import { $, watch } from "rvx";
	 *
	 * const items = $([]);
	 *
	 * watch(items, items => {
	 *   console.log("Items:", items);
	 * });
	 *
	 * items.update(items => {
	 *   items.push("foo");
	 *   items.push("bar");
	 * });
	 * ```
	 */
	update(fn: (value: T) => void | boolean): void {
		if (fn(this.#value) !== false) {
			this.notify();
		}
	}

	/**
	 * Check if this signal has any active observers.
	 */
	get active(): boolean {
		return this.#hooks.size > 0;
	}

	/**
	 * Manually access this signal.
	 */
	access(): void {
		const length = ACCESS_STACK.length;
		if (length > 0) {
			ACCESS_STACK[length - 1]?.(this.#hooks);
		}
	}

	/**
	 * Manually notify observers.
	 *
	 * During batches, notifications are deferred.
	 */
	notify(): void {
		const hooks = this.#hooks;
		if (hooks.size === 0) {
			return;
		}
		if (BATCH === undefined) {
			const record = Array.from(hooks);
			hooks.clear();
			record.forEach(notify);
		} else {
			hooks.forEach(queueBatch);
			/*
				Hooks are not cleared during batches to prevent breaking
				other observers if an error is thrown during the batch.

				Calls are deduplicated within the batch.
			*/
		}
	}

	/**
	 * Pass this signal to a function and get it's result.
	 *
	 * @example
	 * ```tsx
	 * const value = $(42);
	 *
	 * <TextInput value={
	 *   value
	 *     .pipe(parseInt)
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
 * @param source The {@link SignalSource source} this signal has been derived from.
 * @returns The signal.
 */
export function $(): Signal<void>;
export function $<T>(value: T, source?: SignalSource): Signal<T>;
export function $(value?: unknown, source?: SignalSource): Signal<unknown> {
	return new Signal(value, source);
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
export type Expression<T> = T | Signal<T> | (() => T);

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
 * Internal utility to unfold potential recursion into a sequence.
 */
const _unfold = (hook: NotifyHook): NotifyHook => {
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

interface Observer {
	/**
	 * The access hook that can be pushed to the {@link ACCESS_STACK} to track signal accesses using this observer.
	 */
	a: AccessHook;

	/**
	 * Detach this observer from all currently accessed signals.
	 */
	c: () => void;
}

/**
 * Internal utility to create an observer for tracking signal accesses.
 *
 * @param hook The notify hook to add to all accessed signals.
 */
const _observer = (hook: NotifyHook): Observer => {
	/** Array of the hook sets of currently accessed signals. This can contain duplicates. */
	const signals: Set<NotifyHook>[] = [];
	return {
		c: () => {
			for (let i = 0; i < signals.length; i++) {
				signals[i].delete(hook);
			}
			signals.length = 0;
		},
		a: (hooks: Set<NotifyHook>): void => {
			signals.push(hooks);
			hooks.add(hook);
		},
	};
};

/**
 * Internal utility to call a function while tracking signal accesses.
 *
 * @param frame The access hook.
 * @param fn The function to call.
 * @returns The function's return value.
 */
const _access = <T>(frame: AccessHook | undefined, fn: () => T): T => {
	try {
		ACCESS_STACK.push(frame);
		return fn();
	} finally {
		ACCESS_STACK.pop();
	}
};

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * + Both the expression and effect are called at least once immediately.
 * + Lifecycle hooks from the expression or effect are called before a signal update is processed or when the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect An optional function to call with each expression result without tracking signal accesses.
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
export function watch<T>(expr: Reactive<T>, effect: (value: T) => void): void;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can call the effect directly.
 */
export function watch<T>(expr: Static<T>, effect: (value: T) => void): void;

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * + Both the expression and effect are called at least once immediately.
 * + Lifecycle hooks from the expression or effect are called before a signal update is processed or when the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect An optional function to call with each expression result without tracking signal accesses.
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
export function watch<T>(expr: Expression<T>, effect: (value: T) => void): void;
export function watch<T>(expr: Expression<T>, effect?: (value: T) => void): void {
	const isSignal = expr instanceof Signal;
	if (isSignal || typeof expr === "function") {
		let value: T;
		let disposed = false;
		let dispose: TeardownHook = NOOP;
		const runExpr = isSignal ? () => (expr as Signal<T>).value : (expr as () => T);
		const entry = _unfold(Context.wrap(() => {
			if (disposed) {
				// This covers an edge case where this observer is notified during a batch and then disposed immediately.
				return;
			}
			clear();
			isolate(dispose);
			dispose = capture(() => {
				value = _access(access, runExpr);
				if (effect) {
					_access(undefined, () => effect(value));
				}
			});
		}));
		const { c: clear, a: access } = _observer(entry);
		teardown(() => {
			disposed = true;
			clear();
			dispose();
		});
		entry();
	} else {
		effect!(expr);
	}
}

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect A function to call with each subsequent expression result without tracking signal accesses.
 * @returns The first expression result.
 */
export function watchUpdates<T>(expr: Reactive<T>, effect: (value: T) => void): T;

/**
 * @deprecated
 * This call can be removed because the expression is always static.
 */
export function watchUpdates<T>(expr: Static<T>, effect: (value: T) => void): T;

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param effect A function to call with each subsequent expression result without tracking signal accesses.
 * @returns The first expression result.
 */
export function watchUpdates<T>(expr: Expression<T>, effect: (value: T) => void): T;
export function watchUpdates<T>(expr: Expression<T>, effect: (value: T) => void): T {
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

function dispatch(batch: Set<NotifyHook>): void {
	while (batch.size > 0) {
		try {
			batch.forEach(notify => {
				/*
					Notify hooks are deleted individually to ensure the correct behavior if calling
					the hooks adds itself to the batch again due to an immediate side effect.
				*/
				batch.delete(notify);
				notify();
			});
		} finally {
			dispatch(batch);
		}
	}
}

/**
 * Defer signal updates until a function finishes.
 *
 * + When nesting batches, updates are processed after the most outer batch has completed.
 * + When updates cause immediate side effects, these side effects will run as part of the batch.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 *
 * @example
 * The example below outputs `5` and `9` once. Without batching the output would be `5, 7, 9`.
 * ```tsx
 * import { batch, $, watch } from "rvx";
 *
 * const a = $(2);
 * const b = $(3);
 *
 * watch(() => a.value + b.value, value => {
 *   console.log("Sum:", value);
 * });
 *
 * batch(() => {
 *   a.value = 4;
 *   b.value = 5;
 * });
 * ```
 */
export function batch<T>(fn: () => T): T {
	if (BATCH === undefined) {
		const batch = new Set<NotifyHook>();
		let value: T;
		try {
			BATCH = batch;
			value = fn();
			dispatch(batch);
		} finally {
			BATCH = undefined;
		}
		return value;
	}
	return fn();
}

/**
 * {@link watch Watch} an expression and get a function to reactively access it's result.
 *
 * @param expr The expression to watch.
 * @returns A function to reactively access the latest result.
 *
 * @example
 * ```tsx
 * import { $, memo, watch } from "rvx";
 *
 * const count = $(42);
 *
 * const computed = memo(() => someExpensiveComputation(count.value));
 *
 * watch(computed, count => {
 *   console.log("Count:", count);
 * });
 * ```
 */
export function memo<T>(expr: Reactive<T>): () => T;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can use the value directly.
 */
export function memo<T>(expr: Static<T>): () => T;

/**
 * {@link watch Watch} an expression and get a function to reactively access it's result.
 *
 * @param expr The expression to watch.
 * @returns A function to reactively access the latest result.
 *
 * @example
 * ```tsx
 * import { $, memo, watch } from "rvx";
 *
 * const count = $(42);
 *
 * const computed = memo(() => someExpensiveComputation(count.value));
 *
 * watch(computed, count => {
 *   console.log("Count:", count);
 * });
 * ```
 */
export function memo<T>(expr: Expression<T>): () => T;
export function memo<T>(expr: Expression<T>): () => T {
	const signal = $<T>(undefined!);
	watch(() => signal.value = get(expr));
	return () => signal.value;
}

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
export function untrack<T>(expr: Reactive<T>): T;

/**
 * @deprecated
 * This call can be removed because the expression is always static. You can use the value directly.
 */
export function untrack<T>(expr: Static<T>): T;

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
	return useStack(ACCESS_STACK, undefined, () => get(expr));
}

/**
 * Check if signal accesses are currently tracked.
 */
export function isTracking(): boolean {
	return ACCESS_STACK[ACCESS_STACK.length - 1] !== undefined;
}

/**
 * Run a function while tracking signal accesses to invoke the trigger callback when updated.
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
}

/**
 * Create an expression evaluator pipe that calls a function once when any accessed signals from the latest evaluated expression are updated.
 *
 * + When the lifecycle at which the pipe was created is disposed, the callback function will not be called anymore.
 * + It is guaranteed that the function is called before any other observers like {@link watch} or {@link effect} are notified.
 * + If pipes are nested, the callback for the most inner one is called first.
 *
 * @param callback The callback to invoke when a signal is updated.
 * @returns The pipe to evaluate expressions.
 */
export function trigger(callback: () => void): TriggerPipe {
	const hookFn = Context.wrap(() => {
		clear();
		isolate(callback);
	});
	const { c: clear, a: access } = _observer(hookFn);
	teardown(clear);
	return <T>(expr: Expression<T>) => {
		clear();
		try {
			const outerLength = ACCESS_STACK.length;
			if (outerLength > 0) {
				const outer = ACCESS_STACK[outerLength - 1];
				ACCESS_STACK.push(hooks => {
					/*
						Tracking accesses using this observer before any outer ones also
						guarantees the order in which observers are notified because:
						+ Hooks in Signal.#hooks are called in iteration order.
						+ Set iteration order matches the order in which observers add their hooks.
					*/
					access(hooks);
					outer?.(hooks);
				});
			} else {
				ACCESS_STACK.push(access);
			}
			return get(expr);
		} finally {
			ACCESS_STACK.pop();
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
export function map<I, O>(input: Reactive<I>, mapFn: MapFn<I, O>): Expression<O>;

/**
 * @deprecated
 * This call can be removed because the input is always static. You can call the map function directly.
 */
export function map<I, O>(input: Static<I>, mapFn: MapFn<I, O>): Expression<O>;

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
export function map<I, O>(input: Expression<I>, mapFn: MapFn<I, O>): Expression<O>;
export function map<I, O>(input: Expression<I>, mapFn: MapFn<I, O>): Expression<O> {
	if (input instanceof Signal) {
		return () => mapFn(input.value);
	}
	if (typeof input === "function") {
		return () => mapFn((input as () => I)());
	}
	return mapFn(input);
}
