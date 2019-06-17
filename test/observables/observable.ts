
import test from "ava";
import { Observable, Observer } from "../../src/observables";
import { Disposable } from "../../src/disposables";

test("create empty", t => {
	const observable = new Observable();
	const { events } = capture(observable);
	t.deepEqual(events, [ null ]);
});

test("resolve", t => {
	const observable = new Observable<string>(resolve => {
		resolve("foo");
		resolve("bar");
	});
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" }, { resolve: "bar" } ]);
});

test("reject", t => {
	const observable = new Observable((resolve, reject) => {
		reject("foo");
		reject("bar");
	});
	const { events } = capture(observable);
	t.deepEqual(events, [ { reject: "foo" }, { reject: "bar" } ]);
});

test("end", t => {
	const observable = new Observable((resolve, reject, end) => {
		resolve("foo");
		reject("bar");
		end();
		resolve(7);
		resolve(42);
	});
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" }, { reject: "bar" }, null ]);
});

test("unsubscribe", t => {
	let disposed = false;
	const observable = new Observable(() => {
		return () => {
			disposed = true;
		};
	});

	const disposable = observable.subscribe();
	t.false(disposed);
	disposable.dispose();
	t.true(disposed);
});

test("pipe", t => {
	const a = new Observable<string>();
	const b = new Observable<number>();

	t.is(a.pipe(source => {
		t.is(a, source);
		return b;
	}), b);
});

test("extend: start", t => {
	const observable = new class extends Observable<string> {
		protected start(resolve: (value: string) => void) {
			resolve("foo");
		}
	};
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" } ]);
});

test("extend: subscribeResolved", t => {
	let started = false;
	let subscribing = false;
	const observable = new class extends Observable<string> {
		protected start(resolve: (value: string) => void) {
			t.true(subscribing);
			started = true;
			resolve("foo");
		}
		protected subscribeResolved(observer: Partial<Observer<string>>, disposable: Disposable) {
			t.false(started);
			subscribing = true;
			disposable = super.subscribeResolved(observer, disposable);
			t.true(started);
			return disposable;
		}
	};
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" } ]);
});

function capture<T>(observable: Observable<T>): {
	events: ({ resolve: T } | { reject: any } | null)[],
	disposable: Disposable
} {
	const events = [];
	const disposable = observable.subscribe({
		resolve: value => void events.push({ resolve: value }),
		reject: value => void events.push({ reject: value }),
		end: () => void events.push(null)
	});
	return { events, disposable };
}
