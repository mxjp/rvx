import { CollectionPatch } from "./collection-patch";
import { ObservableLike } from "./observable-like";

/**
 * Represents an observable collection.
 * When subscribed to, a collection emits a synchronous patch that represents the current state of the collection.
 */
export interface CollectionLike<T> extends ObservableLike<CollectionPatch<T>> {
	/**
	 * The current state of the collection.
	 */
	readonly items: ReadonlyArray<T>;
}
