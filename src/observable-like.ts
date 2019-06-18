import { CollectionLike } from "./collection-like";
import { CollectionOperator } from "./collection-operator";
import { Disposable } from "./disposable";
import { Observer } from "./observer";
import { Operator } from "./operator";

/**
 * Represents a sequence of values over time.
 */
export interface ObservableLike<T> {
	subscribe(observer?: Partial<Observer<T>> | ((value: T) => void), disposable?: Disposable): Disposable;
	pipe<U>(operator: CollectionOperator<T, U>): CollectionLike<U>;
	pipe<U>(operator: Operator<T, U>): ObservableLike<U>;
}
