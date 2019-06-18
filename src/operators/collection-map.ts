import { Collection } from "../collection";
import { CollectionLike } from "../collection-like";
import { CollectionOperator } from "../collection-operator";
import { CollectionPatch } from "../collection-patch";

/**
 * Create an operator that changes every items in a collection.
 * @param map The map function.
 */
export function collectionMap<T, U>(map: (value: T) => U): CollectionOperator<CollectionPatch<T>, U> {
	return (source: CollectionLike<T>) => new Collection<U>((resolve, reject, end) => source.subscribe({
		resolve: ({ start, end, items }) => {
			resolve({ start, end, items: items.map(map) });
		},
		reject,
		end
	}));
}
