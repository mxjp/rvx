// tslint:disable: file-name-casing
import { Disposable } from "../src/disposable";
import { Observable } from "../src/observable";

export function capture<T>(observable: Observable<T>): {
	readonly events: ({ resolve: T } | { reject: any } | false)[];
	readonly disposable: Disposable;
} {
	const events = [];
	const disposable = observable.subscribe({
		resolve: value => void events.push({ resolve: value }),
		reject: value => void events.push({ reject: value }),
		end: () => void events.push(false)
	});
	return { events, disposable };
}
