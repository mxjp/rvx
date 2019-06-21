import { Operator } from "./operator";
import { Subscribable } from "./subscribable";

/**
 * Represents a sequence of values over time.
 */
export interface ObservableLike<T> extends Subscribable<T> {
	pipe<U>(operator: Operator<T, U>): U;
}

/**
 * Check if a value is like an observable.
 */
export function isObservableLike<T>(value: any): value is ObservableLike<T> {
	return value && typeof value.subscribe === "function" && typeof value.pipe === "function";
}
