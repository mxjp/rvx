import { strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { $, batch, Context, effect, isolate, isTracking, teardown, trigger, uncapture, untrack } from "rvx";
import { assertEvents, withMsg } from "../common.js";

await suite("isolate", async () => {
	await test("inert usage", () => {
		isolate(() => {});
	});

	await test("lifecycle isolation", () => {
		isolate(() => {
			throws(() => teardown(() => {}), withMsg("teardown leak"));
		});
	});

	await test("access isolation", () => {
		const events: unknown[] = [];
		const signal = $(0);
		uncapture(() => {
			effect(() => {
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
		const pipe = uncapture(() => trigger(() => {
			events.push("trigger");
		}));
		uncapture(() => {
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
		assertEvents(events, ["trigger"]);
	});

	await test("context transparency", () => {
		const ctx = new Context(42);
		ctx.inject(77, () => {
			isolate(() => {
				strictEqual(ctx.current, 77);
			});
		});
	});

	await test("batch transparency", () => {
		const events: unknown[] = [];
		const a = $(1);
		const b = $(2);
		uncapture(() => {
			effect(() => {
				events.push(a.value + b.value);
			});
		});
		assertEvents(events, [3]);
		batch(() => {
			a.value = 3;
			isolate(() => {
				b.value = 4;
			});
			assertEvents(events, []);
		});
		assertEvents(events, [7]);
	});
});
