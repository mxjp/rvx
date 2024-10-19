import { deepStrictEqual, fail, rejects, strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { uncapture, watch } from "rvx";
import { AsyncContext, AsyncError } from "rvx/async";

import { assertEvents, future } from "../common.js";

await suite("async/async-context", async () => {
	async function assertErrors(promise: Promise<unknown>, expected: unknown[]) {
		try {
			await promise;
			fail("promise did not reject");
		} catch (error) {
			if (expected.length === 1) {
				strictEqual(error, expected[0]);
			} else {
				strictEqual(error instanceof AsyncError, true);
				deepStrictEqual((error as AsyncError).errors.toSorted(), expected);
			}
		}
	}

	await test("complete empty", async () => {
		const ac = new AsyncContext();
		await ac.complete();
	});

	await test("single task", async () => {
		const ac = new AsyncContext();
		ac.track(Promise.resolve(42));
		ac.track(Promise.resolve("test"));
		await ac.complete();
	});

	await test("single error", async () => {
		const ac = new AsyncContext();
		ac.track(Promise.resolve(42));
		ac.track(Promise.reject("test"));
		await rejects(() => ac.complete());
	});

	await test("multiple errors", async () => {
		const ac = new AsyncContext();
		ac.track(Promise.resolve(42));
		ac.track(Promise.reject("a"));
		ac.track(Promise.reject("b"));
		await assertErrors(ac.complete(), ["a", "b"]);
	});

	for (const [name, reject] of [
		["immediate, in order", (a, b) => {
			a();
			b();
		}],
		["immediate, out of order", (a, b) => {
			b();
			a();
		}],
		["delayed, in order", async (a, b) => {
			await Promise.resolve();
			a();
			await Promise.resolve();
			b();
		}],
		["delayed, out of order", async (a, b) => {
			await Promise.resolve();
			b();
			await Promise.resolve();
			a();
		}],
	] as [
		name: string,
		fn: ((a: () => void, b: () => void) => void | Promise<void>),
	][]) {
		await test(`delayed tracking (${name})`, async () => {
			const ac = new AsyncContext();
			ac.track(Promise.resolve(42));
			const [a,, rejectA] = future();
			ac.track(a);
			const complete = ac.complete();
			const [b,, rejectB] = future();
			ac.track(b);
			await reject(() => rejectA("a"), () => rejectB("b"));
			await assertErrors(complete, ["a", "b"]);
		});
	}

	await test("pending", async () => {
		const events: unknown[] = [];
		const ac = new AsyncContext();
		uncapture(() => watch(() => ac.pending, pending => {
			events.push(pending);
		}));
		assertEvents(events, [false]);
		ac.track(Promise.resolve());
		assertEvents(events, [true]);
		await Promise.resolve();
		assertEvents(events, [false]);

		const [promise,, reject] = future();
		ac.track(promise);
		assertEvents(events, [true]);
		const complete = ac.complete();
		reject(42);
		const error = await complete.catch(e => e) as unknown;
		strictEqual(error, 42);
		assertEvents(events, [false]);
	});
});
