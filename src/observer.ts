
/**
 * Represents an observer.
 */
export interface Observer<T> {
	/**
	 * Resolve the next value.
	 */
	resolve(value: T): void;

	/**
	 * Reject the next value.
	 */
	reject(value: any): void;
}

/**
 * Check if a value is an observer.
 */
export function isObserver<T>(value: any): value is Observer<T> {
	return value && typeof value.resolve === "function" && typeof value.reject === "function";
}
