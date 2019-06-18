import { Observable } from "../observable";
import { ObservableLike } from "../observable-like";
import { Operator } from "../operator";

/**
 * Create an operator that filters values.
 * @param filter The filter function.
 */
export function filter<T>(filter: (value: T) => any): Operator<T, T> {
	return (source: ObservableLike<T>) => new Observable<T>((resolve, reject, end) => source.subscribe({
		resolve: value => {
			if (filter(value)) {
				resolve(value);
			}
		},
		reject,
		end
	}));
}
