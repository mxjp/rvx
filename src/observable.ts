import { Disposable } from "./disposable";
import { DisposeLogic } from "./dispose-logic";
import { ObservableBase } from "./observable-base";
import { Observer } from "./observer";

const OBSERVERS = Symbol("observers");
const RESOURCES = Symbol("resources");
const STATE = Symbol("state");

/**
 * Represents a sequence of values over time.
 */
export class Observable<T> extends ObservableBase<T> {
	public constructor(start?: (this: Observable<T>, resolve: (value: T) => void, reject: (error: any) => void, end: () => void) => DisposeLogic) {
		super();
		if (start) {
			this.start = start;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<Observer<T>>>();
	private readonly [RESOURCES] = new Disposable();
	private [STATE]: "new" | "started" | "ended" = "new";

	/**
	 * Check if this observable is new.
	 */
	protected get isNew() {
		return this[STATE] === "new";
	}

	/**
	 * Called when this observable is first subscribed to.
	 * @param observer The observer representing all current observers.
	 */
	protected start(resolve: (value: T) => void, reject: (error: any) => void, end: () => void): DisposeLogic {
		end();
	}

	/**
	 * Called to intercept the creation of the resolve callback.
	 * @param resolve The resolve callback.
	 * @returns The actual resolve callback.
	 */
	protected interceptResolve(resolve: (value: T) => void): (value: T) => void {
		return resolve;
	}

	/**
	 * Called to intercept the creation of the reject callback.
	 * @param reject The reject callback.
	 * @returns The actual reject callback.
	 */
	protected interceptReject(reject: (value: any) => void): (value: any) => void {
		return reject;
	}

	/**
	 * Called to intercept the creation of the end callback.
	 * @param end The end callback.
	 * @returns The actual end callback.
	 */
	protected interceptEnd(end: () => void): () => void {
		return end;
	}

	/**
	 * Called when this observable is subscribed to.
	 */
	protected subscribeResolved(observer: Partial<Observer<T>>, disposable: Disposable) {
		const observers = this[OBSERVERS];

		if (this[STATE] === "ended") {
			if (observer.end) {
				observer.end();
			}
			return disposable;
		} else {
			observers.add(observer);
		}

		if (this[STATE] === "new") {
			this[STATE] = "started";
			this[RESOURCES].add(this.start(this.interceptResolve(value => {
				if (this[STATE] === "started") {
					for (const observer of observers) {
						if (observer.resolve) {
							observer.resolve(value);
						}
					}
				}
			}), this.interceptReject(value => {
				if (this[STATE] === "started") {
					for (const observer of observers) {
						if (observer.reject) {
							observer.reject(value);
						}
					}
				}
			}), this.interceptEnd(() => {
				if (this[STATE] === "started") {
					this[STATE] = "ended";
					for (const observer of observers) {
						if (observer.end) {
							observer.end();
						}
					}
				}
			})));
		}

		disposable.add(() => {
			if (observers.delete(observer) && observers.size === 0) {
				this[RESOURCES].dispose();
			}
		});

		return disposable;
	}

	/**
	 * Subscribe to this observable.
	 */
	public subscribe(observer?: Partial<Observer<T>> | ((value: T) => void), disposable = new Disposable()) {
		return this.subscribeResolved(typeof observer === "function" ? { resolve: observer } : (observer || { }), disposable);
	}

	/**
	 * Create an observable that emits a single value and ends.
	 */
	public static value<T>(value: T) {
		return new Observable((resolve, reject, end) => {
			resolve(value);
			end();
		});
	}

	/**
	 * Create an observable from an iterable.
	 */
	public static iterable<T>(value: Iterable<T>) {
		return new Observable<T>((resolve, reject, end) => {
			try {
				for (const next of (value as Iterable<T>)) {
					resolve(next);
				}
			} catch (error) {
				reject(error);
			}
			end();
		});
	}
}
