import { strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { extract, teardown } from "rvx";
import { runTest } from "rvx/test";
import { assertEvents } from "../common.js";

await suite("test/run-sync", async () => {
	await test("lifecycle", () => {
		const events: unknown[] = [];
		const result = runTest(() => {
			teardown(() => {
				events.push("a");
			});
			teardown(() => {
				events.push("b");
			});
			assertEvents(events, []);
			return 42;
		});
		assertEvents(events, ["b", "a"]);
		strictEqual(result, 42);
	});

	await test("error handling", () => {
		const events: unknown[] = [];
		throws(() => {
			runTest(ctx => {
				teardown(() => {
					events.push("a");
				});
				teardown(() => {
					events.push("b");
				});
				assertEvents(events, []);
				throw new Error("test");
			});
		}, error => {
			return error instanceof Error && error.message === "test";
		});
		assertEvents(events, ["b", "a"]);
	});

	await test("context", () => {
		runTest(ctx => {
			ctx.set("foo", "bar");
			strictEqual(extract("foo"), "bar");
		});
	});
});
