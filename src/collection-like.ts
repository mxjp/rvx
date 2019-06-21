import { CollectionPatch } from "./collection-patch";
import { ObservableLike } from "./observable-like";

/**
 * Represents an observable collection.
 * When subscribed to, a collection emits a synchronous patch that represents the current state of the collection.
 */
export interface CollectionLike<T> extends ObservableLike<CollectionPatch<T>> {
	getItems(): readonly T[];
}

/**
 * Check if an observable like is like a collection.
 */
export function isCollectionLike<T>(value: ObservableLike<CollectionPatch<T>>): value is CollectionLike<T> {
	return typeof (value as any).getItems === "function";
}
