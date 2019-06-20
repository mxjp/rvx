
/**
 * Represents the partial change of a collection as a range that is replaced with specified items.
 */
export interface CollectionPatch<T> {
	/**
	 * The inclusive start index.
	 */
	start: number;
	/**
	 * The number of removed items.
	 */
	count: number;
	/**
	 * The new items.
	 */
	items: T[];
}
