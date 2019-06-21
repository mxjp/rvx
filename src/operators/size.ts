import { CollectionLike } from "../collection-like";
import { Observable } from "../observable";

/**
 * An operator that computes the size of a collection.
 */
export function size<T>(source: CollectionLike<T>) {
	let size: number;
	return new Observable<number>(observer => source.subscribe({
		resolve: value => {
			if (size === undefined) {
				size = value.items.length;
				observer.resolve(size);
			} else {
				const change = value.items.length - value.count;
				if (change !== 0) {
					size += change;
					observer.resolve(size);
				}
			}
		},
		reject: value => observer.reject(value)
	}), observer => {
		if (size !== undefined) {
			observer.resolve(size);
		}
	});
}
