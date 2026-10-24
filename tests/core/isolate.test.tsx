import { strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { $, Context, dispatch, isolate, isTracking, leak, teardown, trigger, untrack, watch } from "rvx";
import { assertEvents, withMsg } from "../common.js";

await suite("isolate", async () => {
	await test("inert usage", () => {
		isolate(() => {});
	});

	await test("lifecycle isolation", () => {
		isolate(() => {
			throws(() => teardown(() => {}), withMsg("G5"));
		});
	});

	await test("access isolation", () => {
		const events: unknown[] = [];
		const signal = $(0);
		leak(() => {
			watch(() => {
				isolate(() => {
					events.push(signal.value);
				});
			});
		});
		assertEvents(events, [0]);
		signal.value++;
		assertEvents(events, []);
	});

	await test("tracking isolation", () => {
		const events: unknown[] = [];
		const signal = $(0);
		const pipe = leak(() => trigger(() => {
			events.push("trigger");
		}));
		leak(() => {
			untrack(() => {
				strictEqual(isTracking(), false);
				isolate(() => {
					pipe(() => {
						strictEqual(isTracking(), true);
						signal.access();
					});
				});
			});
		});
		assertEvents(events, []);
		signal.value++;
		assertEvents(events, []);
		dispatch();
		assertEvents(events, ["trigger"]);
	});

	await test("context transparency", () => {
		const ctx = new Context(42);
		ctx.provide(77, () => {
			isolate(() => {
				strictEqual(ctx.current, 77);
			});
		});
	});
});
