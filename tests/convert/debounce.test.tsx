import { strictEqual } from "node:assert";
import test from "node:test";
import { $, capture, Signal } from "rvx";
import { debounce } from "rvx/convert";
import { poll } from "rvx/test";

await test("convert/debounce", async () => {
	const source = $(0);
	const delay = 10;

	let input!: Signal<number>;
	const dispose = capture(() => {
		input = source.pipe(debounce, delay);
	});

	strictEqual(source.value, 0);
	strictEqual(input.value, 0);

	input.value = 1;
	strictEqual(source.value, 0);
	strictEqual(input.value, 1);

	await poll(() => source.value === 1, delay * 2);
	strictEqual(input.value, 1);

	source.value = 2;
	strictEqual(source.value, 2);
	strictEqual(input.value, 2);

	input.value = 3;
	source.value = 4;
	strictEqual(source.value, 4);
	strictEqual(input.value, 4);
	await new Promise(r => setTimeout(r, delay * 2));
	strictEqual(source.value, 4);
	strictEqual(input.value, 4);

	input.value = 5;
	input.value = 6;
	strictEqual(source.value, 4);
	strictEqual(input.value, 6);

	await poll(() => source.value === 6, delay * 2);
	strictEqual(input.value, 6);

	input.value = 7;
	dispose();
	strictEqual(source.value, 6);
	strictEqual(input.value, 7);
	await new Promise(r => setTimeout(r, delay * 2));
	strictEqual(source.value, 6);
	strictEqual(input.value, 7);
});
