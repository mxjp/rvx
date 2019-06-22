import { ObservableLike } from "./observable-like";

/**
 * An observable that starts with an initial value and resolves the current value when subscribed to.
 */
export interface SubjectLike<T> extends ObservableLike<T> {
	/**
	 * Get the current value.
	 */
	getValue(): T;
}

/**
 * Check if an observable is already a subject.
 */
export function isSubjectLike<T>(value: ObservableLike<T>): value is SubjectLike<T> {
	return typeof (value as any).getValue === "function";
}
