import { DisposeLogic } from "./dispose-logic";
import { Observer } from "./observer";

/**
 * Represents a sequence of values over time.
 */
export interface Subscribable<T> {
	subscribe(observer?: Partial<Observer<T>> | ((value: T) => void)): DisposeLogic;
}

/**
 * Check if a value is subscribable.
 */
export function isSubscribable<T>(value: any): value is Subscribable<T> {
	return value && typeof value.subscribe === "function" && typeof value.pipe === "function";
}
