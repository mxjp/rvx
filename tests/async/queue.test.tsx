import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { uncapture } from "rvx";
import { Queue } from "rvx/async";

import { assertEvents } from "../common.js";

await suite("async/queue", async () => {
	await test("sync side effect", () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		queue.sideEffect(signal => {
			events.push(0);
			strictEqual(signal.aborted, false);
			events.push(1);
		});
		events.push(2);
		assertEvents(events, [0, 1, 2]);
	});

	await test("sync blocking", () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		void queue.block(() => {
			events.push(0);
		});
		events.push(1);
		assertEvents(events, [0, 1]);
	});

	await test("abort side effect", async () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		queue.sideEffect(async signal => {
			events.push(0);
			await Promise.resolve();
			events.push(1, signal.aborted);
		});
		events.push(2);
		queue.sideEffect(() => {});
		await Promise.resolve();
		assertEvents(events, [0, 2, 1, true]);
	});

	await test("dequeue side effect & run most recent", async () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		queue.sideEffect(async signal => {
			events.push(0);
			await Promise.resolve();
			events.push(1, signal.aborted);
		});
		queue.sideEffect(() => events.push(2));
		queue.sideEffect(() => events.push(3));
		queue.sideEffect(signal => events.push(4, signal.aborted));
		await Promise.resolve();
		assertEvents(events, [0, 1, true]);
		await Promise.resolve();
		assertEvents(events, [4, false]);
		queue.sideEffect(() => events.push(5));
		await Promise.resolve();
		assertEvents(events, [5]);
	});

	await test("abort side effects by blocking tasks", async () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		queue.sideEffect(async signal => {
			events.push(0);
			await Promise.resolve();
			events.push(1, signal.aborted);
		});
		events.push(2);
		const result = queue.block(async () => {
			events.push(3);
			return 42;
		});
		events.push(4);
		queue.sideEffect(() => {
			events.push(5);
		});
		await result;
		assertEvents(events, [0, 2, 4, 1, true, 3]);
		await Promise.resolve();
		assertEvents(events, []);
	});

	await test("multiple blocking tasks", async () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		queue.sideEffect(async signal => {
			events.push(0);
			await Promise.resolve();
			events.push(1, signal.aborted);
		});
		const a = queue.block(() => {
			events.push("a");
			return "a";
		});
		const b = queue.block(() => {
			events.push("b");
			return "b";
		});
		assertEvents(events, [0]);
		strictEqual(await a, "a");
		strictEqual(await b, "b");
		assertEvents(events, [1, true, "a", "b"]);
	});

	await test("side effect after blocking", async () => {
		const events: unknown[] = [];
		const queue = uncapture(() => new Queue());
		await queue.block(() => {
			events.push(0);
		});
		events.push(1);
		queue.sideEffect(() => {
			events.push(2);
		});
		events.push(3);
		assertEvents(events, [0, 1, 2, 3]);
	});
});
