import { Collection } from "../collection";
import { CollectionLike } from "../collection-like";
import { CollectionPatch } from "../collection-patch";
import { Operator } from "../operator";

/**
 * Create an operator that maps every item in a collection.
 * @param map The map function.
 */
export function mapItems<T, U>(map: (value: T) => U): Operator<CollectionPatch<T>, CollectionLike<U>> {
	return (source: CollectionLike<T>) => {
		return new Collection<U>(observer => source.subscribe({
			resolve: value => observer.resolve({
				start: value.start,
				count: value.count,
				items: value.items.map(map)
			}),
			reject: value => observer.reject(value)
		}));
	};
}
