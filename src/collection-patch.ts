
/**
 * Represents the partial change of a collection as a range that is replaced with specified items.
 */
export interface CollectionPatch<T> {
	/**
	 * The exclusive start index.
	 * If false, the start of the context is used.
	 */
	start: number | false;
	/**
	 * The exclusive end index.
	 * If false, the end of the context is used.
	 */
	end: number | false;
	/**
	 * The new items.
	 */
	items: T[];
}
