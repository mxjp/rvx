import test from "ava";
import { Subject } from "../src";
import { capture } from "./_utility";

test("behavior", t => {
	const subject = new Subject<string>();
	const { events } = capture(subject);
	subject.resolve("bar");
	subject.reject(42);
	t.deepEqual(events, [
		{ resolve: "bar" },
		{ reject: 42 }
	]);
});
