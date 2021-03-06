import test from "ava";
import { dispose } from "../src";

test("invoke function", t => {
	dispose(() => t.pass());
});

test("invoke disposable", t => {
	dispose({
		dispose: () => t.pass()
	});
});

test("invoke void", t => {
	dispose();
	t.pass();
});
