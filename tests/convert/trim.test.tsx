import { strictEqual } from "node:assert";
import test from "node:test";
import { $, capture, dispatch, Signal } from "rvx";
import { trim } from "rvx/convert";

await test("convert/trim", () => {
	const source = $("foo");

	let input!: Signal<string>;
	const dispose = capture(() => {
		input = source.pipe(trim);
	});

	strictEqual(source.value, "foo");
	strictEqual(input.value, "foo");

	input.value = " bar ";
	dispatch();
	strictEqual(source.value, "bar");
	strictEqual(input.value, " bar ");

	input.notify();
	dispatch();
	strictEqual(source.value, "bar");
	strictEqual(input.value, " bar ");

	source.value = "baz";
	dispatch();
	strictEqual(source.value, "baz");
	strictEqual(input.value, "baz");

	dispose();
	source.value = "a";
	dispatch();
	strictEqual(source.value, "a");
	strictEqual(input.value, "baz");

	input.value = "b";
	dispatch();
	strictEqual(source.value, "a");
	strictEqual(input.value, "b");
});
