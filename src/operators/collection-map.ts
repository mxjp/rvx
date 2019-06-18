import { Collection } from "../collection";
import { CollectionLike } from "../collection-like";
import { CollectionPatch } from "../collection-patch";
import { Operator } from "../operator";

/**
 * Create an operator that changes every items in a collection.
 * @param map The map function.
 */
export function collectionMap<T, U>(map: (value: T) => U): Operator<CollectionPatch<T>, CollectionPatch<U>> {
	return (source: CollectionLike<T>) => new Collection<U>((resolve, reject, end) => source.subscribe({
		resolve: ({ start, end, items }) => {
			resolve({ start, end, items: items.map(map) });
		},
		reject,
		end
	}));
}
