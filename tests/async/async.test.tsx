import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { uncapture } from "rvx";
import { ASYNC, Async, AsyncContext } from "rvx/async";

import { assertEvents, future, text } from "../common.js";

await suite("async/async", async () => {
	await test("tracking", async () => {
		const events: unknown[] = [];
		const [promise, resolve] = future();
		const ac = new AsyncContext();
		const root = uncapture(() => <div>
			{ASYNC.inject(ac, () => <Async source={promise} />)}
		</div>) as HTMLElement;
		strictEqual(text(root), "");
		const complete = ac.complete().then(() => {
			events.push("complete");
		});
		await Promise.resolve();
		assertEvents(events, []);
		resolve();
		await complete;
		assertEvents(events, ["complete"]);
	});

	await test("errors", async () => {
		const events: unknown[] = [];
		const [promise,, reject] = future();
		const ac = new AsyncContext();
		const root = uncapture(() => <div>
			{ASYNC.inject(ac, () => <Async source={promise} />)}
		</div>) as HTMLElement;
		strictEqual(text(root), "");
		const complete = ac.complete().catch(error => {
			events.push(error);
		});
		await Promise.resolve();
		assertEvents(events, []);
		reject("test");
		await complete;
		assertEvents(events, ["test"]);
	});

	await test("content, resolve", async () => {
		const [promise, resolve] = future<number>();
		const root = uncapture(() => <div>
			<Async source={promise} pending={() => "pending"}>
				{value => `resolved: ${value}`}
			</Async>
		</div>) as HTMLElement;
		strictEqual(text(root), "pending");
		resolve(42);
		await Promise.resolve();
		strictEqual(text(root), "resolved: 42");
	});

	await test("content, reject", async () => {
		const [promise,, reject] = future<number>();
		const root = uncapture(() => <div>
			<Async
				source={promise}
				pending={() => "pending"}
				rejected={error => `rejected: ${error}`}
			/>
		</div>) as HTMLElement;
		strictEqual(text(root), "pending");
		reject(42);
		await Promise.resolve();
		strictEqual(text(root), "rejected: 42");
	});
});
