import { Disposable } from "./disposable";
import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";
import { isObservableLike } from "./observable-like";

/**
 * Resolve a binding to the first non-observable.
 * @param value The binding to resolve.
 * @param resolve Called to resolve a value.
 * @param reject Called if an error occurs.
 */
export function resolveBinding(value: any, resolve: (value: any) => void, reject: (value: any) => void): DisposeLogic {
	if (isObservableLike(value)) {
		let fork: DisposeLogic = null;
		const subscription = new Disposable(value.subscribe({
			resolve: value => {
				dispose(fork);
				fork = resolveBinding(value, resolve, reject);
			},
			reject
		}));
		subscription.add(() => dispose(fork));
		return subscription;
	} else {
		resolve(value);
	}
}
