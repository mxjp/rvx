
import { DisposeLogic, Disposable } from "./disposables";

/**
 * Represents an observer.
 */
export interface Observer<T> {
	/**
	 * Push the next resolved value.
	 * @param value
	 */
	resolve(value: T): Promise<any> | void;

	/**
	 * Push the next rejected error.
	 * @param value
	 */
	reject(value: any): Promise<any> | void;

	/**
	 * Signal, that the observed subject will never push a next value again.
	 */
	end(): void;
}

/**
 * A partial observer, only the resolve callback or nothing.
 */
export type PartialObserver<T> = Partial<Observer<T>> | ((value: T) => Promise<any> | void) | void;

/**
 * Resolve a partial observer or the resolve function to an observer object.
 */
export function resolveObserver<T>(observer: PartialObserver<T>): Partial<Observer<T>> {
	return typeof observer === "function" ? { resolve: observer } : (observer || {});
}

const OBSERVERS = Symbol("observers");
const RESOURCES = Symbol("resources");
const STATE = Symbol("state");

/**
 * Represents a sequence of values over time.
 */
export class Observable<T> {
	public constructor(start?: (this: Observable<T>, observer: Observer<T>) => DisposeLogic) {
		if (start) {
			this.start = start;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<Observer<T>>>();
	private readonly [RESOURCES] = new Disposable();
	private [STATE]: "new" | "started" | "ended";

	/**
	 * Called when this observable is first subscribed to.
	 * @param observer The observer representing all current observers.
	 */
	protected start(observer: Observer<T>): DisposeLogic {
	}

	/**
	 * Called when this observable is subscribed to.
	 * @param observer
	 * @param disposable
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
			this[RESOURCES].add(this.start({
				resolve: value => {
					if (this[STATE] === "started") {
						for (const observer of observers) {
							if (observer.resolve) {
								observer.resolve(value);
							}
						}
					}
				},
				reject: value => {
					if (this[STATE] === "started") {
						for (const observer of observers) {
							if (observer.reject) {
								observer.reject(value);
							}
						}
					}
				},
				end: () => {
					if (this[STATE] === "started") {
						this[STATE] = "ended";
						for (const observer of observers) {
							if (observer.end) {
								observer.end();
							}
						}
					}
				}
			}));
		}

		disposable.add(() => {
			if (observers.delete(observer) && observers.size === 0) {
				return this[RESOURCES].dispose();
			}
		});

		return disposable;
	}

	/**
	 * Subscribe to this observable.
	 * @param partialObserver
	 * @param disposable
	 */
	public subscribe(partialObserver?: PartialObserver<T>, disposable = new Disposable()) {
		return this.subscribeResolved(resolveObserver(partialObserver), disposable);
	}
}
