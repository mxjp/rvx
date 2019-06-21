import { CollectionLike } from "../collection-like";
import { Observable } from "../observable";

/**
 * An operator to get an array of items from a collection.
 */
export function items<T>(source: CollectionLike<T>) {
	let items: T[];
	return new Observable<T[]>(observer => source.subscribe({
		resolve: () => observer.resolve(items = Array.from(source.getItems())),
		reject: value => observer.reject(value)
	}), observer => {
		if (items) {
			observer.resolve(items);
		}
	});
}
