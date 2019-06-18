// tslint:disable: file-name-casing
import { Collection, Disposable, ObservableLike } from "../src";

export function capture<T>(observable: ObservableLike<T>): {
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

export function smallCollection() {
	return new Collection<string>((resolve, reject, end) => {
		resolve({ start: false, end: false, items: ["foo", "bar"] });
		resolve({ start: false, end: 1, items: ["baz"] });
		resolve({ start: 0, end: false, items: ["foo"] });
		resolve({ start: 0, end: 1, items: ["bar"] });
		end();
	});
}
