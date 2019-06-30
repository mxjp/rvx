import test from "ava";
import { Collection, filter, items, map, mapItems, Observable, size, Subject, unwrap } from "../src";
import { capture, captureItems, smallCollection } from "./_utility";

test("filter", t => {
	const { events } = capture(new Observable<number>(observer => {
		observer.resolve(3);
		observer.resolve(11);
		observer.resolve(5);
		observer.resolve(7);
	}).pipe(filter(v => v > 5)));
	t.deepEqual(events, [ { resolve: 11 }, { resolve: 7 } ]);
});

test("items", t => {
	const observable = smallCollection().pipe(items);
	const { events } = capture(observable);
	t.deepEqual(events, [
		{ resolve: [ "foo", "bar" ] },
		{ resolve: [ "baz", "bar" ] },
		{ resolve: [ "baz", "foo" ] },
		{ resolve: [ "baz", "bar", "foo" ] },
	]);
});

test("map items", t => {
	const { events } = captureItems(new Collection<number>(observer => {
		observer.resolve({ start: 0, count: 0, items: [1, 2, 3] });
		observer.resolve({ start: 1, count: 1, items: [4, 5] });
	}).pipe(mapItems(v => v * 3)));
	t.deepEqual(events, [
		{ resolve: [ 3, 6, 9 ] },
		{ resolve: [ 3, 12, 15, 9 ] }
	]);
});

test("map", t => {
	const { events } = capture(new Observable<number>(observer => {
		observer.resolve(6);
		observer.resolve(7);
	}).pipe(map(v => v * 6)));
	t.deepEqual(events, [ { resolve: 36 }, { resolve: 42 } ]);
});

test("size", t => {
	const observable = smallCollection().pipe(size);
	const { events } = capture(observable);

	t.deepEqual(events, [
		{ resolve: 2 },
		{ resolve: 3 }
	]);

	t.deepEqual(capture(observable).events, [ { resolve: 3 } ]);
	t.deepEqual(capture(new Collection().pipe(size)).events, [ ]);
});

test("unwrap", t => {
	const source = new Subject();
	const { events } = capture(source.pipe(unwrap));

	const a = new Subject();
	source.resolve(a);

	a.resolve("foo");
	a.reject("bar");

	source.resolve(Observable.value("baz"));
	a.resolve(42);

	t.deepEqual(events, [
		{ resolve: "foo" },
		{ reject: "bar" },
		{ resolve: "baz" }
	]);
});
