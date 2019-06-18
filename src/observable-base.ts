import { Disposable } from "./disposable";
import { ObservableLike } from "./observable-like";
import { Observer } from "./observer";
import { Operator } from "./operator";

/**
 * Abstract base class for observables.
 */
export abstract class ObservableBase<T> implements ObservableLike<T> {
	public abstract subscribe(observer?:  Partial<Observer<T>> | ((value: T) => void), disposable?: Disposable): Disposable;

	/**
	 * Apply an operator function to this observable.
	 */
	public pipe<U>(operator: Operator<T, U>): ObservableLike<U> {
		return operator(this);
	}
}
