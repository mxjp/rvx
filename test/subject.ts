import test from "ava";
import { Subject } from "../src";
import { capture } from "./_utility";

test("output", t => {
	const subject = new Subject<string>();
	subject.resolve("foo");
	subject.reject(7);
	const { events } = capture(subject);
	subject.resolve("baz");
	subject.reject(42);
	subject.end();
	t.deepEqual(events, [
		{ resolve: "baz" },
		{ reject: 42 },
		false
	]);
});

test("end before subscribed", t => {
	const subject = new Subject<string>();
	subject.end();
	const { events } = capture(subject);
	t.deepEqual(events, [false]);
});
