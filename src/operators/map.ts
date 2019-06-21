import { Observable } from "../observable";
import { ObservableLike } from "../observable-like";
import { Operator } from "../operator";

/**
 * Create an operator that maps every resolved value.
 * @param map The map function.
 */
export function map<T, U>(map: (value: T) => U): Operator<T, Observable<U>> {
	return (source: ObservableLike<T>) => new Observable<U>(observer => source.subscribe({
		resolve: value => observer.resolve(map(value)),
		reject: value => observer.reject(value)
	}));
}
