import { CollectionLike } from "../collection-like";
import { Observable } from "../observable";

/**
 * An operator that creates an observable of the collection items.
 */
export function collectionItems<T>(source: CollectionLike<T>) {
	return new Observable<ReadonlyArray<T>>((resolve, reject, end) => source.subscribe({
		resolve: patch => {
			resolve(source.items);
		},
		reject,
		end
	}));
}
