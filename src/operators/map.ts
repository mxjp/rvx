import { Observable } from "../observable";
import { ObservableLike } from "../observable-like";
import { Operator } from "../operator";

/**
 * Create an operator that changes every value.
 * @param map The map function.
 */
export function map<T, U>(map: (value: T) => U): Operator<T, U> {
	return (source: ObservableLike<T>) => new Observable<U>((resolve, reject, end) => source.subscribe({
		resolve: value => resolve(map(value)),
		reject,
		end
	}));
}
