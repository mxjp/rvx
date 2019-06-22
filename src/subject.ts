import { Observable } from "./observable";
import { Observer } from "./observer";
import { SubjectLike } from "./subject-like";

const VALUE = Symbol("value");

/**
 * An observable that starts with an initial value and resolves the current value when subscribed to.
 */
export class Subject<T> extends Observable<T> implements SubjectLike<T> {
	public constructor(value: T) {
		super();
		this[VALUE] = value;
	}

	protected each(observer: Observer<T>) {
		observer.resolve(this[VALUE]);
	}

	/**
	 * Get the current value.
	 */
	public getValue() {
		return this[VALUE];
	}

	public resolve(value: T) {
		this[VALUE] = value;
		super.resolve(value);
	}
}
