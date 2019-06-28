import { Observer } from "./observer";
import { Subject } from "./subject";

const RESOLVED = Symbol("state");
const VALUE = Symbol("value");

/**
 * A subject that emits it's latest value to new observers.
 */
export class State<T> extends Subject<T> {
	public constructor(value?: T) {
		super();
		if (value !== undefined) {
			this[RESOLVED] = true;
			this[VALUE] = value;
		}
	}

	private [RESOLVED] = false;
	private [VALUE]: T = undefined;

	public get value() {
		if (this[RESOLVED]) {
			return this[VALUE];
		}
	}

	protected each(observer: Partial<Observer<T>>) {
		if (this[RESOLVED] && observer.resolve) {
			observer.resolve(this[VALUE]);
		}
	}

	protected notifyResolve(value: T) {
		this[RESOLVED] = true;
		this[VALUE] = value;
		super.notifyResolve(value);
	}

	protected notifyReject(value: T) {
		this[RESOLVED] = false;
		super.notifyReject(value);
	}
}
