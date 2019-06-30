import { dispose } from "../dispose";
import { DisposeLogic } from "../dispose-logic";
import { Observable } from "../observable";
import { ObservableLike } from "../observable-like";

/**
 * An operator that unwraps an observable of observables.
 */
export function unwrap<T>(source: ObservableLike<ObservableLike<T>>) {
	return new Observable<T>(observer => {
		let fork: DisposeLogic;
		const subscription = source.subscribe(observable => {
			dispose(fork);
			fork = observable.subscribe(observer);
		});
		return () => {
			dispose(subscription);
		};
	});
}
