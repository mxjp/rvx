import { throws } from "node:assert";
import test, { suite } from "node:test";

import { capture, Emitter, uncapture } from "rvx";

import { assertEvents, withMsg } from "../common.js";

await suite("events", async () => {
	await test("usage", () => {
		const events: unknown[] = [];
		const emitter = new Emitter<[foo: string, bar: number]>();

		events.push(0);
		const removeA = capture(() => {
			emitter.event((foo, _bar) => {
				events.push(["a", foo]);
			});
		});
		events.push(1);
		emitter.emit("a", 1);
		assertEvents(events, [0, 1, ["a", "a"]]);

		const removeB = capture(() => {
			emitter.event((_foo, bar) => {
				events.push(["b", bar]);
			});
		});
		events.push(2);
		emitter.emit("b", 2);
		assertEvents(events, [2, ["a", "b"], ["b", 2]]);

		removeA();
		emitter.emit("c", 3);
		assertEvents(events, [["b", 3]]);

		removeB();
		emitter.emit("d", 4);
		assertEvents(events, []);
	});

	await test("error handling", () => {
		const events: unknown[] = [];
		const emitter = new Emitter<[]>();

		uncapture(() => {
			emitter.event(() => events.push(0));
			emitter.event(() => {
				events.push(1);
				throw new Error("test");
			});
			emitter.event(() => events.push(2));
			emitter.event(() => events.push(3));
		});

		throws(() => {
			emitter.emit();
		}, withMsg("test"));

		assertEvents(events, [0, 1]);
	});
});
