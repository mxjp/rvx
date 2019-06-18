import test from "ava";
import { filter, map, Observable } from "../src";
import { capture } from "./_utility";

test("filter", t => {
	const { events } = capture(Observable.iterable([3, 11, 5, 7]).pipe(filter(v => v > 5)));
	t.deepEqual(events, [ { resolve: 11 }, { resolve: 7 }, false ]);
});

test("map", t => {
	const { events } = capture(Observable.iterable([6, 7]).pipe(map(v => v * 6)));
	t.deepEqual(events, [ { resolve: 36 }, { resolve: 42 }, false ]);
});
