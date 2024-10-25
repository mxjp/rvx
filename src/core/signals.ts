import { Context } from "./context.js";
import { useStack } from "./internals.js";
import { capture, nocapture, teardown, TeardownHook } from "./lifecycle.js";

let BATCH: Set<NotifyHook> | undefined;
const TRACKING_STACK: boolean[] = [true];
const ACCESS_STACK: AccessHook[] = [];

/**
 * A function that is called by a signal or batch when updated.
 */
interface NotifyHook {
	(): void;
}

/**
 * A function that is called by a signal when accessed.
 */
interface AccessHook {
	/**
	 * @param hooks A set of notify hooks that an observer can attach to.
	 */
	(hooks: Set<NotifyHook>): void;
}

/**
 * A function used in signals to determine if the signal should update during a value assignment.
 */
export interface SignalEqualsFn<T> {
	/**
	 * @param previous The previous value.
	 * @param current The current value.
	 * @returns False to update.
	 */
	(previous: T, current: T): boolean;
}

const notify = (fn: NotifyHook) => fn();
const queueBatch = (fn: NotifyHook) => BATCH!.add(fn);

const SIGNAL_EQUALS_DEFAULT: SignalEqualsFn<unknown> = Object.is;
const SIGNAL_EQUALS_DISABLED: SignalEqualsFn<unknown> = () => false;

/**
 * Represents a value that changes over time.
 */
export class Signal<T> {
	/**
	 * The current value.
	 */
	#value: T;

	/**
	 * * A function to determine if the signal should update during a value assignment.
	 */
	#equals: SignalEqualsFn<T>;

	#hooks = new Set<NotifyHook>();

	/**
	 * Create a new signal.
	 *
	 * @param value The initial value.
	 * @param equals True to skip updates when an assigned value is strictly equal to the previous one or a function to determine of the values are equal. Default is true.
	 */
	constructor(value: T, equals: SignalEqualsFn<T> | boolean = true) {
		this.#value = value;
		this.#equals = typeof equals === "function"
			? equals
			: (equals ? SIGNAL_EQUALS_DEFAULT : SIGNAL_EQUALS_DISABLED);
	}

	/**
	 * Access the current value.
	 */
	get value(): T {
		this.access();
		return this.#value;
	}

	/**
	 * Set the current value.
	 *
	 * @example
	 * ```tsx
	 * import { sig, watch } from "rvx";
	 *
	 * const count = sig(0);
	 *
	 * watch(count, count => {
	 *   console.log("Count:", count);
	 * });
	 *
	 * count.value++;
	 * ```
	 */
	set value(value: T) {
		if (!this.#equals(this.#value, value)) {
			this.#value = value;
			this.notify();
		}
	}

	/**
	 * Update the current value in place.
	 *
	 * @param fn A function to update the value. If false is returned, dependants are not notified.
	 *
	 * @example
	 * ```tsx
	 * import { sig, watch } from "rvx";
	 *
	 * const items = sig([]);
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
	 * Check if this signal has any active dependants.
	 */
	get active(): boolean {
		return this.#hooks.size > 0;
	}

	/**
	 * Manually access this signal.
	 */
	access(): void {
		if (TRACKING_STACK[TRACKING_STACK.length - 1]) {
			ACCESS_STACK[ACCESS_STACK.length - 1]?.(this.#hooks);
		}
	}

	/**
	 * Manually notify dependants.
	 */
	notify(): void {
		if (BATCH === undefined) {
			const hooks = Array.from(this.#hooks);
			this.#hooks.clear();
			hooks.forEach(notify);
		} else {
			this.#hooks.forEach(queueBatch);
		}
	}

	/**
	 * Pass this signal to a function and get it's result.
	 *
	 * @example
	 * ```tsx
	 * const value = sig(42);
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
 * @param equals True to skip updates when an assigned value is strictly equal to the previous one or a function to determine if the values are equal. Default is true.
 * @returns The signal.
 */
export function sig(): Signal<void>;
export function sig<T>(value: T, equals?: SignalEqualsFn<T> | boolean): Signal<T>;
export function sig<T>(value?: T, equals?: SignalEqualsFn<T> | boolean): Signal<T> {
	return new Signal<T>(value!, equals);
}

/**
 * A value, signal or function to get a value.
 *
 * @example
 * ```tsx
 * import { sig, watch } from "rvx";
 *
 * const message = sig("Example");
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
 * Type for the result of an expression.
 */
export type ExpressionResult<T> = T extends Expression<infer R> ? R : never;

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

const _observer = (hook: NotifyHook) => {
	const signals: Set<NotifyHook>[] = [];
	const sub = (hooks: Set<NotifyHook>): void => {
		signals.push(hooks);
		hooks.add(hook);
	};
	const clear = () => {
		for (let i = 0; i < signals.length; i++) {
			signals[i].delete(hook);
		}
		signals.length = 0;
	};
	return { clear, sub };
};

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param fn The function to call with the expression result. This is guaranteed to be called at least once immediately. Lifecycle hooks are called before the next function call or when the current lifecycle is disposed.
 *
 * @example
 * ```tsx
 * import { sig, watch } from "rvx";
 *
 * const count = sig(0);
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
export function watch<T>(expr: Expression<T>, fn: (value: T) => void): void {
	if (expr instanceof Signal || typeof expr === "function") {
		let value: T;
		let disposed = false;
		let dispose: TeardownHook | undefined;
		const runExpr = Context.capture(() => value = get(expr));
		const runFn = Context.capture(() => fn(value));
		const entry = _unfold(() => {
			if (disposed) {
				return;
			}
			try {
				clear();
				ACCESS_STACK.push(sub);
				TRACKING_STACK.push(true);
				nocapture(runExpr);
			} finally {
				ACCESS_STACK.pop();
				TRACKING_STACK.pop();
			}
			dispose?.();
			dispose = capture(runFn);
		});
		const { clear, sub } = _observer(entry);
		teardown(() => {
			disposed = true;
			clear();
			dispose?.();
		});
		entry();
	} else {
		fn(expr);
	}
}

/**
 * Watch an expression until the current lifecycle is disposed.
 *
 * @param expr The expression to watch.
 * @param fn The function to call with the expression result when any updates occur.
 * @returns The first expression result.
 */
export function watchUpdates<T>(expr: Expression<T>, fn: (value: T) => void): T {
	let first: T;
	let update = false;
	watch(expr, value => {
		if (update) {
			fn(value);
		} else {
			first = value;
			update = true;
		}
	});
	return first!;
}

/**
 * Run and watch a function until the current lifecycle is disposed.
 *
 * Note, that this doesn't separate signal accesses from side effects which makes it easier to accidentally cause infinite loops. If possible, use {@link watch} or {@link watchUpdates} instead.
 *
 * @param fn The function to run. Lifecycle hooks  are called before the next function call or when the current lifecycle is disposed.
 */
export function effect(fn: () => void): void {
	let disposed = false;
	let dispose: TeardownHook | undefined;
	const runFn = Context.capture(fn);
	const entry = _unfold(() => {
		if (disposed) {
			return;
		}
		dispose?.();
		try {
			clear();
			ACCESS_STACK.push(sub);
			TRACKING_STACK.push(true);
			dispose = capture(runFn);
		} finally {
			ACCESS_STACK.pop();
			TRACKING_STACK.pop();
		}
	});
	const { clear, sub } = _observer(entry);
	teardown(() => {
		disposed = true;
		clear();
		dispose?.();
	});
	entry();
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
 * import { batch, sig, watch } from "rvx";
 *
 * const a = sig(2);
 * const b = sig(3);
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
			while (batch.size > 0) {
				batch.forEach(notify => {
					batch.delete(notify);
					notify();
				});
			}
		} finally {
			BATCH = undefined;
		}
		return value;
	}
	return fn();
}

/**
 * Watch an expression and create a function to reactively access it's latest result.
 *
 * This is similar to {@link lazy}, but the expression is always evaluated and then updates it's dependants.
 *
 * @param expr The expression to watch.
 * @param equals True to skip updates when a result is strictly equal to the previous one or a function to determine if the results are equal. Default is true.
 * @returns A function to access the latest result.
 *
 * @example
 * ```tsx
 * import { sig, memo, watch } from "rvx";
 *
 * const count = sig(42);
 *
 * const computed = memo(() => someExpensiveComputation(count.value));
 *
 * watch(computed, count => {
 *   console.log("Count:", count);
 * });
 * ```
 */
export function memo<T>(expr: Expression<T>, equals?: SignalEqualsFn<T> | boolean): () => T {
	const signal = sig<T>(undefined!, equals);
	watch(expr, value => signal.value = value);
	return () => signal.value;
}

/**
 * Run a function while not tracking signal accesses.
 *
 * This is the opposite of {@link track}.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 *
 * @example
 * ```tsx
 * import { sig, untrack, watch } from "rvx";
 *
 * const a = sig(2);
 * const b = sig(3);
 *
 * watch(() => a.value + untrack(() => b.value), sum => {
 *   console.log("Sum:", sum);
 * });
 *
 * a.value = 4;
 * b.value = 5;
 * ```
 */
export function untrack<T>(fn: () => T): T {
	return useStack(TRACKING_STACK, false, fn);
}

/**
 * Run a function while tracking signal accesses. This is the default behavior.
 *
 * This is the opposite of {@link untrack}.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function track<T>(fn: () => T): T {
	return useStack(TRACKING_STACK, true, fn);
}

/**
 * Check if a currently evaluating expression is tracking signal accesses.
 */
export function isTracking(): boolean {
	return TRACKING_STACK[TRACKING_STACK.length - 1] && ACCESS_STACK[ACCESS_STACK.length - 1]?.length > 0;
}

export interface TriggerPipe {
	<T>(expr: Expression<T>): T;
}

/**
 * Create an expression evaluator pipe that calls a function once when any accessed signals from the latest evaluated expression are updated.
 *
 * + When the lifecycle at which the pipe was created is disposed, the callback function will not be called anymore.
 * + It is guaranteed that the function is called before any other observers like {@link watch} or {@link effect} are notified.
 * + If pipes are nested, the callback for the most inner one is called first.
 *
 * @param fn The callback to invoke when a signal is updated.
 * @returns The pipe to evaluate expressions.
 */
export function trigger(fn: () => void): TriggerPipe {
	const hookFn = Context.capture(() => {
		clear();
		fn();
	});
	const { clear, sub } = _observer(hookFn);
	teardown(clear);
	return <T>(expr: Expression<T>) => {
		clear();
		try {
			const outer = ACCESS_STACK[ACCESS_STACK.length - 1] as AccessHook | undefined;
			ACCESS_STACK.push(hooks => {
				sub(hooks);
				outer?.(hooks);
			});
			return get(expr);
		} finally {
			ACCESS_STACK.pop();
		}
	};
}

/**
 * Evaulate an expression.
 *
 * This can be used to access reactive and non reactive inputs.
 *
 * @param expr The expression to evaluate.
 * @returns The expression result.
 *
 * @example
 * ```tsx
 * import { sig, get } from "rvx";
 *
 * const count = sig(42);
 *
 * get(42) // 42
 * get(count) // 42
 * get(() => 42) // 42
 * ```
 */
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
 * import { sig, map, get } from "rvx";
 *
 * const count = sig(42);
 * const doubleCount = map(count, value => value * 2);
 *
 * get(doubleCount) // 84
 * ```
 */
export function map<I, O>(input: Expression<I>, mapFn: MapFn<I, O>): Expression<O> {
	if (input instanceof Signal) {
		return () => mapFn(input.value);
	}
	if (typeof input === "function") {
		return () => mapFn((input as () => I)());
	}
	return mapFn(input);
}

/**
 * Map an expression value to strings.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { string } from "rvx";
 *
 * <div some-value={string(true)} />; // <div some-value="true" />
 * <div some-value={string(false)} />; // <div some-value="false" />
 * <div some-value={string(null)} />; // <div some-value="null" />
 * ```
 */
export function string(input: Expression<unknown>): Expression<string> {
	return map(input, value => String(value));
}

/**
 * Map an expression value to strings unless it's null or undefined.
 *
 * See {@link map}.
 *
 * @example
 * ```tsx
 * import { optionalString } from "rvx";
 *
 * <div some-value={optionalString(false)} />; // <div some-value="false" />
 * <div some-value={optionalString(null)} />; // <div />
 * ```
 */
export function optionalString<T>(input: Expression<T>): Expression<string | Exclude<T, Exclude<T, null | undefined>>> {
	return map<T, unknown>(input, value => {
		if (value === null || value === undefined) {
			return value;
		}
		return String(value);
	}) as Expression<string | Exclude<T, Exclude<T, null | undefined>>>;
}
