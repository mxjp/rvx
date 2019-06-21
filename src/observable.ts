import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";
import { ObservableLike } from "./observable-like";
import { Observer } from "./observer";
import { Operator } from "./operator";
import { Subscribable } from "./subscribable";

const OBSERVERS = Symbol("observers");
const RESOURCE = Symbol("resource");
const STARTED = Symbol("state");

/**
 * Represents a sequence of values over time.
 */
export class Observable<T> implements ObservableLike<T> {
	public constructor(
		start?: ((this: Observable<T>, observer: Observer<T>) => DisposeLogic) | Subscribable<T>,
		each?: (this: Observable<T>, observer: Observer<T>) => void
	) {
		if (typeof start === "function") {
			this.start = start;
		} else if (start) {
			this.start = observer => start.subscribe(observer);
		}
		if (typeof each === "function") {
			this.each = each;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<Observer<T>>>();
	private [STARTED] = false;
	private [RESOURCE]: DisposeLogic;

	/**
	 * Called when this observable is first subscribed to.
	 * @param observer The observer representing all current observers. Usually, this is this observable itself.
	 */
	protected start(observer: Observer<T>): DisposeLogic {
	}

	/**
	 * Called for each new observer that is subscribing.<br>
	 * The observer is added to this observable after each has finished.
	 * @param observer The observer that is subscribing.
	 */
	protected each(observer: Partial<Observer<T>>) {
	}

	/**
	 * Resolve the next value.
	 */
	public resolve(value: T) {
		for (const observer of this[OBSERVERS]) {
			if (observer.resolve) {
				observer.resolve(value);
			}
		}
	}

	/**
	 * Reject the next value.
	 */
	public reject(value: any) {
		for (const observer of this[OBSERVERS]) {
			if (observer.reject) {
				observer.reject(value);
			}
		}
	}

	/**
	 * Subscribe to this observable.
	 */
	public subscribe(observer?: Partial<Observer<T>> | ((value: T) => void)): DisposeLogic {
		const resolved = typeof observer === "function" ? { resolve: observer } : (observer || { });
		this.each(resolved);
		this[OBSERVERS].add(resolved);

		if (!this[STARTED]) {
			this[STARTED] = true;
			this[RESOURCE] = this.start(this);
		}

		return () => {
			if (this[OBSERVERS].delete(resolved) && this[OBSERVERS].size === 0) {
				dispose(this[RESOURCE]);
			}
		};
	}

	public pipe<U>(operator: Operator<T, U>): U {
		return operator(this);
	}

	public static value<T>(value: T) {
		return new Observable<T>(null, observer => observer.resolve(value));
	}
}
