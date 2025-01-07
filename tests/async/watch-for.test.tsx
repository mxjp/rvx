import { rejects, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $ } from "rvx";
import { watchFor } from "rvx/async";

await suite("async/wait-for", async () => {
	await test("static", async () => {
		strictEqual(await watchFor(42), 42);
	});

	await test("default condition", async () => {
		const signal = $(0);
		const promise = watchFor(signal);
		signal.value = 7;
		strictEqual(await promise, 7);
	});

	await test("custom condition", async () => {
		const signal = $(7);
		const promise = watchFor(signal, v => v === 42);
		signal.value = 42;
		strictEqual(await promise, 42);
	});

	await test("guard condition", async () => {
		function isNumber(value: unknown): value is number {
			return typeof value === "number";
		}
		const signal = $<unknown>("test");
		const promise: Promise<number> = watchFor(signal, isNumber);
		signal.value = 42;
		strictEqual(await promise, 42);
	});

	await test("timeout", async () => {
		await rejects(async () => {
			await watchFor(7, v => v === 42, 0);
		});
	});
});
