import test from "ava";
import { Observable, State } from "../src";
import { capture } from "./_utility";

test("state", t => {
	const state = new State<string>();
	const { events } = capture(state);
	t.is(state.value, undefined);

	state.resolve("foo");
	t.is(state.value, "foo");
	t.deepEqual(capture(new Observable(state)).events, [ { resolve: "foo" } ]);

	state.reject("bar");
	t.is(state.value, undefined);
	t.deepEqual(capture(new Observable(state)).events, [ ]);

	state.resolve("baz");
	t.is(state.value, "baz");
	t.deepEqual(capture(new Observable(state)).events, [ { resolve: "baz" } ]);

	t.deepEqual(events, [
		{ resolve: "foo" },
		{ reject: "bar" },
		{ resolve: "baz" }
	]);
});

test("initial value", t => {
	const state = new State("foo");
	const { events } = capture(state);
	t.deepEqual(events, [ { resolve: "foo" } ]);
});
