
/**
 * Represents an observer.
 */
export interface Observer<T> {
	/**
	 * Push the next resolved value.
	 */
	resolve(value: T): void;

	/**
	 * Push the next rejected error.
	 */
	reject(value: any): void;

	/**
	 * Signal, that the observed subject will never push a next value again.
	 */
	end(): void;
}
