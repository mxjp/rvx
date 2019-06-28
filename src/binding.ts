
import { Disposable } from "./disposable";
import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";
import { isObservableLike } from "./observable-like";
import { isObserver, Observer } from "./observer";
import { Subscribable } from "./subscribable";

/**
 * Resolve a binding.
 */
export function resolveBinding<T>(value: Binding<T>, resolve: (value: T) => void, reject: (value: any) => void): DisposeLogic {
	if (isObservableLike<Binding<T>>(value)) {
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
		resolve(value as T);
	}
}

/**
 * Resolve a binding to the first value that is returned by the provided map function.
 */
export function mapResolveBinding<T, U>(value: Binding<T>, map: (value: Binding<T>) => U, resolve: (value: U) => void, reject: (value: any) => void): DisposeLogic {
	const result = map(value as T);
	if (result !== undefined) {
		resolve(result);
	} else if (isObservableLike<Binding<T>>(value)) {
		let fork: DisposeLogic = null;
		const subscription = new Disposable(value.subscribe({
			resolve: value => {
				dispose(fork);
				fork = mapResolveBinding<T, U>(value, map, resolve, reject);
			},
			reject
		}));
		subscription.add(() => dispose(fork));
		return subscription;
	} else {
		reject(Object.assign(new Error("Unable to resolve binding"), { value }));
	}
}

/**
 * Resolve an output binding.
 */
export function resolveOutputBinding<T>(value: Binding<Output<T>>, resolve: (value: ResolvedOutput<T>) => void, reject: (value: any) => void): DisposeLogic {
	return mapResolveBinding<Output<T>, ResolvedOutput<T>>(value, value => {
		if (typeof value === "function") {
			return { type: "function", value };
		} else if (isObserver(value)) {
			return { type: "observer", value };
		}
	}, resolve, reject);
}

/**
 * Represents a resolved output binding.
 */
export type ResolvedOutput<T> = {
	readonly type: "function";
	readonly value: (value: T) => void;
} | {
	readonly type: "observer";
	readonly value: Observer<T>;
};

/**
 * Represents a bound value that can be used as output.
 */
export type Output<T> = Observer<T> | ((value: T) => void);

/**
 * Represents a binding.
 */
export type Binding<T> = T | SubscribableBinding<T>;

interface SubscribableBinding<T> extends Subscribable<Binding<T>> { }
