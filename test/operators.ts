import test from "ava";
import { filter, map, Observable } from "../src";
import { capture } from "./_utility";

// test("collection items", t => {
// 	const { events } = capture(smallCollection().pipe(collectionItems));
// 	t.deepEqual(events, [
// 		{ resolve: ["foo", "bar"] },
// 		{ resolve: ["baz", "bar"] },
// 		{ resolve: ["baz", "foo"] },
// 		{ resolve: ["baz", "bar", "foo"] },
// 		false
// 	]);
// });

// test("collection map", t => {
// 	const collection = Collection.items([6, 7]).pipe(collectionMap(v => v * 6));
// 	collection.subscribe();
// 	t.deepEqual(collection.items, [36, 42]);
// });

// test("collection size", t => {
// 	const { events } = capture(smallCollection().pipe(collectionSize));
// 	t.deepEqual(events, [ { resolve: 2 }, { resolve: 3 }, false ]);
// });

test("filter", t => {
	const { events } = capture(Observable.iterable([3, 11, 5, 7]).pipe(filter(v => v > 5)));
	t.deepEqual(events, [ { resolve: 11 }, { resolve: 7 }, false ]);
});

test("map", t => {
	const { events } = capture(Observable.iterable([6, 7]).pipe(map(v => v * 6)));
	t.deepEqual(events, [ { resolve: 36 }, { resolve: 42 }, false ]);
});
