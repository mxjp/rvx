import { Observable } from "./observable";
import { Observer } from "./observer";

/**
 * An observable that can be used as an observer.
 */
export class Subject<T> extends Observable<T> implements Observer<T> {
	public constructor() {
		super();
		this.subscribe();
	}

	protected start(resolve: (value: T) => void, reject: (value: any) => void, end: () => void) {
		this.resolve = resolve;
		this.reject = reject;
		this.end = end;
	}

	public resolve(value: T) {
	}

	public reject(value: any) {
	}

	public end() {
		const subscription = this.subscribe();
		this.end();
		subscription.dispose();
	}
}
