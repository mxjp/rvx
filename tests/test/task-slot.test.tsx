import test, { suite } from "node:test";
import { exclusive } from "rvx/test";
import { assertEvents, future } from "../common.js";

await suite("test/queue", async () => {
	const KEY_A = Symbol("a");
	const KEY_B = Symbol("b");

	await test("exclusive", async () => {
		const events: unknown[] = [];

		const [promiseA, resolveA] = future();
		const [promiseB, resolveB] = future();

		exclusive(KEY_B, async () => {
			events.push(3);
			await promiseB;
			events.push(4);
		});

		exclusive(KEY_A, async () => {
			events.push(0);
			await promiseA;
			events.push(1);
		});

		exclusive(KEY_A, async () => {
			events.push(2);
		});

		assertEvents(events, [3, 0]);
		resolveA();
		await Promise.resolve();
		assertEvents(events, [1]);

		await Promise.resolve();
		assertEvents(events, [2]);

		resolveB();
		await Promise.resolve();
		assertEvents(events, [4]);
	});
});
