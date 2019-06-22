import test from "ava";
import { Subject } from "../src";
import { capture } from "./_utility";

test("behavior", t => {
	const subject = new Subject<string>("foo");
	t.is(subject.getValue(), "foo");

	const { events } = capture(subject);
	t.deepEqual(events, [ { resolve: "foo" } ]);

	subject.resolve("bar");
	subject.reject(42);
	t.deepEqual(events, [
		{ resolve: "foo" },
		{ resolve: "bar" },
		{ reject: 42 }
	]);
});
