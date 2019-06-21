import { Observable } from "../observable";
import { ObservableLike } from "../observable-like";
import { Operator } from "../operator";

/**
 * Create an operator that filters values.
 * @param filter The filter function.
 */
export function filter<T>(filter: (value: T) => any): Operator<T, Observable<T>> {
	return (source: ObservableLike<T>) => new Observable<T>(observer => source.subscribe({
		resolve: value => {
			if (filter(value)) {
				observer.resolve(value);
			}
		},
		reject: value => {
			observer.reject(value);
		}
	}));
}
