import { CollectionLike } from "../collection-like";
import { Observable } from "../observable";

/**
 * An operator that creates an observable of the collection size.
 */
export function collectionSize<T>(source: CollectionLike<T>): Observable<number> {
	return new Observable<number>((resolve, reject, end) => {
		let size = 0;
		return source.subscribe({
			resolve: ({ start, end, items }) => {
				resolve(size = size + items.length - (end === false ? size : end) + (start === false ? 0 : (start + 1)));
			},
			reject,
			end
		});
	});
}
