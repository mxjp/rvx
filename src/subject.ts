import { Observable } from "./observable";
import { Observer } from "./observer";

/**
 * An observable that can be resolved or rejected from somewhere else.
 */
export class Subject<T> extends Observable<T> implements Observer<T> {
	public resolve(value: T) {
		this.notifyResolve(value);
	}

	public reject(value: any) {
		this.notifyReject(value);
	}

	public wrap(): Observable<T> {
		return new Observable<T>(this);
	}
}
