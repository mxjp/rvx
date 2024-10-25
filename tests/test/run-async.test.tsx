import { rejects, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { teardown } from "rvx";
import { ASYNC } from "rvx/async";
import { runAsyncTest } from "rvx/test";
import { assertEvents } from "../common.js";

await suite("test/run-async", async () => {
	await test("lifecycle & async completion", async () => {
		const events: unknown[] = [];
		const result = await runAsyncTest(async testCtx => {
			throws(() => {
				teardown(() => {});
			});
			testCtx.use(() => {
				strictEqual(ASYNC.current, testCtx.asyncCtx);
				teardown(() => {
					events.push("a");
				});
				teardown(() => {
					events.push("b");
				});
			});
			await Promise.resolve();
			testCtx.use(() => {
				teardown(() => {
					events.push("c");
				});
			});
			assertEvents(events, []);
			testCtx.asyncCtx.track((async () => {
				await new Promise<void>(r => queueMicrotask(r));
				events.push("async");
			})());
			return 42;
		});
		assertEvents(events, ["c", "b", "a", "async"]);
		strictEqual(result, 42);
	});

	await test("in flow error handling", async () => {
		const events: unknown[] = [];

		await rejects(() => runAsyncTest(async testCtx => {
			testCtx.use(() => {
				teardown(() => {
					events.push("a");
				});
				teardown(() => {
					events.push("b");
				});
			});
			await Promise.resolve();
			testCtx.use(() => {
				teardown(() => {
					events.push("c");
				});
			});
			throw new Error("test");
		}), error => {
			return error instanceof Error && error.message === "test";
		});
		assertEvents(events, ["c", "b", "a"]);
	});

	await test("out of flow error handling", async () => {
		const events: unknown[] = [];
		await rejects(() => runAsyncTest(async testCtx => {
			testCtx.asyncCtx.track((async () => {
				await new Promise<void>(r => queueMicrotask(r));
				throw new Error("test");
			})());
			events.push("done");
		}), error => {
			assertEvents(events, ["done"]);
			return error instanceof Error && error.message === "test";
		});
	});

	await test("out of flow error masking", async () => {
		const events: unknown[] = [];
		await rejects(() => runAsyncTest(async testCtx => {
			testCtx.asyncCtx.track((async () => {
				await new Promise<void>(r => queueMicrotask(r));
				events.push("throw out of flow");
				throw new Error("out of flow");
			})());
			events.push("throw in flow");
			throw new Error("in flow");
		}), error => {
			assertEvents(events, ["throw in flow", "throw out of flow"]);
			return error instanceof Error && error.message === "in flow";
		});
	});
});
