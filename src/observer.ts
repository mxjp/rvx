
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
