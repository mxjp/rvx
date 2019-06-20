import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";
import { isObservableLike } from "./observable-like";

export function resolveBinding(value: any, resolve: (value: any) => void, reject: (value: any) => void): DisposeLogic {
	if (isObservableLike(value)) {
		let fork: DisposeLogic = null;
		const subscription = value.subscribe({
			resolve: value => {
				dispose(fork);
				fork = resolveBinding(value, resolve, reject);
			},
			reject
		});
		subscription.add(() => dispose(fork));
		return subscription;
	} else {
		resolve(value);
	}
}
