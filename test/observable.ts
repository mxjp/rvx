import test from "ava";
import { Disposable, Observable, Observer } from "../src";
import { capture } from "./_utility";

test("create empty", t => {
	const observable = new Observable();
	const { events } = capture(observable);
	t.deepEqual(events, [ false ]);
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
	t.deepEqual(events, [ { resolve: "foo" }, { reject: "bar" }, false ]);
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

test("value", t => {
	const { events } = capture(Observable.value("foo"));
	t.deepEqual(events, [ { resolve: "foo" }, false ]);
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
