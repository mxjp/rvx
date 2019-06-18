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
				const change = items.length - (end === false ? size : end) + (start === false ? 0 : (start + 1));
				if (change !== 0) {
					size += change;
					resolve(size);
				}
			},
			reject,
			end
		});
	});
}
