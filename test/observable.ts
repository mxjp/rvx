import test from "ava";
import { dispose, Observable, Observer } from "../src";
import { capture } from "./_utility";

test("create empty", t => {
	const observable = new Observable();
	const { events } = capture(observable);
	t.deepEqual(events, []);
});

test("create from subscribable", t => {
	const source = new Observable(observer => {
		observer.resolve("foo");
		observer.reject("bar");
	});
	const { events } = capture(new Observable(source));
	t.deepEqual(events, [ { resolve: "foo" }, { reject: "bar" } ]);
});

test("resolve", t => {
	const observable = new Observable<string>(observer => {
		observer.resolve("foo");
		observer.resolve("bar");
	});
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" }, { resolve: "bar" } ]);
});

test("reject", t => {
	const observable = new Observable(observer => {
		observer.reject("foo");
		observer.reject("bar");
	});
	const { events } = capture(observable);
	t.deepEqual(events, [ { reject: "foo" }, { reject: "bar" } ]);
});

test("unsubscribe", t => {
	let disposed = false;
	const observable = new Observable(() => {
		return () => {
			disposed = true;
		};
	});

	const resource = observable.subscribe();
	t.false(disposed);
	dispose(resource);
	t.true(disposed);
});

test("once", t => {
	const { events } = capture(Observable.value("foo"));
	t.deepEqual(events, [ { resolve: "foo" } ]);
});

test("extend: start", t => {
	const observable = new class extends Observable<string> {
		protected start(observer: Observer<string>) {
			observer.resolve("foo");
		}
	};
	const { events } = capture(observable);
	t.deepEqual(events, [ { resolve: "foo" } ]);
});

test("extend: each", t => {
	const observable = new class extends Observable<string> {
		protected each(observer: Observer<string>) {
			observer.resolve("foo");
		}
	};
	t.deepEqual(capture(observable).events, [ { resolve: "foo" } ]);
	t.deepEqual(capture(observable).events, [ { resolve: "foo" } ]);
});
