import { deepStrictEqual, fail, notStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { For, Index, uncapture, View, watchUpdates } from "rvx";
import { wrap } from "rvx/store";

import { assertEvents, viewText } from "../common.js";
import { WrapTest } from "./common.js";

await suite("store/reactive-array-proxy", async () => {
	await test("inert usage", () => {
		const inner = ["a", "b"];
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);
		strictEqual(proxy instanceof Array, true);
		strictEqual(Array.isArray(proxy), true);
		assertEntries([inner, proxy], ["a", "b"]);
		proxy.push("c");
		assertEntries([inner, proxy], ["a", "b", "c"]);
		inner.push("d");
		assertEntries([inner, proxy], ["a", "b", "c", "d"]);
	});

	await suite("updates", async () => {
		function assertUpdates(options: {
			start: string[];
			action: (target: string[]) => void;
			end: string[];
			events: unknown[];
		}): void {
			{
				const target = Array.from(options.start);
				options.action(target);
				deepStrictEqual(target, options.end);
			}
			{
				const events: unknown[] = [];
				const inner = Array.from(options.start);
				const proxy = wrap(inner);
				uncapture(() => {
					const maxEntries = 10;
					watchUpdates(() => {
						function noop(_arg: unknown) {}
						noop(proxy.length);
						for (let i = 0; i < maxEntries; i++) {
							noop(proxy[i]);
						}
					}, () => {
						events.push("batch");
					});
					watchUpdates(() => proxy.length, value => {
						events.push(["length", value]);
					});
					for (let i = 0; i < maxEntries; i++) {
						watchUpdates(() => proxy[i], value => {
							events.push([i, value]);
						});
					}
				});
				options.action(proxy);
				assertEvents(events, options.events);
				assertEntries([inner, proxy], options.end);
			}
		}

		await test("copyWithin", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.copyWithin(1, 2, 3), p),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b", "c", "d"],
				action: p => strictEqual(p.copyWithin(2, 0, 2), p),
				end: ["a", "b", "a", "b"],
				events: [
					"batch",
					[2, "a"],
					[3, "b"],
				],
			});
		});

		await test("fill", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.fill("a"), p),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b", "c"],
				action: p => strictEqual(p.fill("b"), p),
				end: ["b", "b", "b"],
				events: [
					"batch",
					[0, "b"],
					[2, "b"],
				],
			});
		});

		await test("pop", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.pop(), undefined),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b", "c"],
				action: p => strictEqual(p.pop(), "c"),
				end: ["a", "b"],
				events: [
					"batch",
					[2, undefined],
					["length", 2],
				],
			});
		});

		await test("push", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.push(), 0),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a"],
				action: p => strictEqual(p.push("b", "c"), 3),
				end: ["a", "b", "c"],
				events: [
					"batch",
					[1, "b"],
					[2, "c"],
					["length", 3],
				],
			});
		});

		await test("reverse", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.reverse(), p),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a"],
				action: p => strictEqual(p.reverse(), p),
				end: ["a"],
				events: [],
			});
			assertUpdates({
				start: ["a", "b"],
				action: p => strictEqual(p.reverse(), p),
				end: ["b", "a"],
				events: [
					"batch",
					[0, "b"],
					[1, "a"],
				],
			});
		});

		await test("shift", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.shift(), undefined),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b", "c"],
				action: p => strictEqual(p.shift(), "a"),
				end: ["b", "c"],
				events: [
					"batch",
					[0, "b"],
					[1, "c"],
					[2, undefined],
					["length", 2],
				],
			});
		});

		await test("sort", () => {
			assertUpdates({
				start: [],
				action: p => strictEqual(p.sort(), p),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["b", "c", "a", "d"],
				action: p => strictEqual(p.sort(), p),
				end: ["a", "b", "c", "d"],
				events: [
					"batch",
					[0, "a"],
					[1, "b"],
					[2, "c"],
				],
			});
		});

		await test("splice", () => {
			assertUpdates({
				start: [],
				action: p => deepStrictEqual(p.splice(0), []),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b", "c"],
				action: p => deepStrictEqual(p.splice(1, 1, "d", "e"), ["b"]),
				end: ["a", "d", "e", "c"],
				events: [
					"batch",
					[3, "c"],
					[1, "d"],
					[2, "e"],
					["length", 4],
				],
			});
		});

		await test("unshift", () => {
			assertUpdates({
				start: [],
				action: p => deepStrictEqual(p.unshift(), 0),
				end: [],
				events: [],
			});
			assertUpdates({
				start: ["a", "b"],
				action: p => strictEqual(p.unshift("c", "d"), 4),
				end: ["c", "d", "a", "b"],
				events: [
					"batch",
					[3, "b"],
					[2, "a"],
					[0, "c"],
					[1, "d"],
					["length", 4],
				],
			});
		});
	});

	await test("conversion", () => {
		const inner = [new WrapTest()];
		const proxy = wrap(inner);
		proxy.push(new WrapTest());
		inner.push(new WrapTest());

		assertWrapped(inner, false);
		assertWrapped(proxy, true);

		function assertWrapped(target: WrapTest[], wrapped: boolean) {
			// Wrapping is tested using multiple access methods to ensure, that this propagates through APIs not explicitly replaced with reactive versions:

			for (let i = 0; i < target.length; i++) {
				strictEqual(target[i].wrapped, wrapped);
			}

			strictEqual(target.every(p => p.wrapped === wrapped), true);
		}
	});

	await suite("reactive access", async () => {
		await test("at", () => {
			const events: unknown[] = [];
			const proxy = wrap(["a", "b"]);
			uncapture(() => {
				watchUpdates(() => proxy.at(1), value => {
					events.push(value);
				});
			});
			proxy[0] = "c";
			assertEvents(events, []);
			proxy[1] = "d";
			assertEvents(events, ["d"]);
		});

		for (const [name, access] of [
			["slice", p => p.slice(0, 2)],
			["toString (implicit)", p => String(p)],
			["toString (explicit)", p => p.toString()],
			["values", p => Array.from(p.values())],
			["concat", p => p.concat("d", "e")],
			["entries", p => Array.from(p.entries())],
			["iterator", p => Array.from(p)],
			["every", p => p.every(_x => true)],
			["find", p => p.find(_x => false)],
			["findIndex", p => p.findIndex(_x => false)],
			["findLast", p => p.findLast(_x => false)],
			["findLastIndex", p => p.findLastIndex(_x => false)],
			["flat", p => p.flat()],
			["flatMap", p => p.flatMap(_x => 42)],
			["forEach", p => p.forEach(() => {})],
			["includes", p => p.includes("x")],
			["indexOf", p => p.indexOf("x")],
			["lastIndexOf", p => p.lastIndexOf("x")],
			["join", p => p.join(",")],
			["map", p => p.map(_x => 42)],
			["reduce", p => p.reduce(() => 77, 42)],
			["reduceRight", p => p.reduceRight(() => 77, 42)],
			["some", p => p.some(() => false)],
			["toLocaleString", p => p.toLocaleString()],
			["toReversed", p => p.toReversed()],
			["toSorted", p => p.toSorted()],
			["toSpliced", p => p.toSpliced(0, 0)],
			["with", p => p.with(0, "x")],
		] as [string, (target: string[]) => void][]) {
			await test(name, () => {
				const events: unknown[] = [];
				const proxy = wrap(["a", "b", "c"]);
				uncapture(() => {
					watchUpdates(() => access(proxy), () => {
						events.push("access");
					});
				});
				proxy.push("d");
				assertEvents(events, ["access"]);
				proxy.unshift("d");
				assertEvents(events, ["access"]);
				proxy[1] = "e";
				assertEvents(events, ["access"]);
			});
		}
	});

	await suite("index specific inert access", async () => {
		for (const [name, access] of [
			["keys", p => p.keys()],
			["slice", p => p.slice(1, 1)],
			["entries", p => p.entries()],
			["iterator", p => p.entries()],
			["every", p => strictEqual(p.every(x => x !== "a"), false)],
			["find", p => strictEqual(p.find(x => x === "a"), "a")],
			["findIndex", p => strictEqual(p.findIndex(x => x === "a"), 0)],
			["findLast", p => strictEqual(p.findLast(x => x === "c"), "c")],
			["findLastIndex", p => strictEqual(p.findLastIndex(x => x === "c"), 2)],
			["includes", p => strictEqual(p.includes("a"), true)],
			["some", p => strictEqual(p.some(x => x === "a"), true)],
			["with", p => deepStrictEqual(p.with(1, "x"), ["a", "x", "c"])],
		] as [string, (target: string[]) => void][]) {
			await test(name, () => {
				const proxy = wrap(["a", "b", "c"]);
				uncapture(() => {
					watchUpdates(() => access(proxy), () => {
						fail("unexpected update");
					});
				});
				proxy[1] = "d";
			});
		}
	});

	await suite("view compat", async () => {
		function viewCompatTest(render: (proxy: string[]) => View) {
			return () => {
				const proxy = wrap(["a", "b"]);
				const view = uncapture(() => render(proxy));
				strictEqual(viewText(view), "ab");
				proxy.splice(1, 0, "c");
				strictEqual(viewText(view), "acb");
			};
		}

		await test("<For>", viewCompatTest(proxy => <For each={proxy}>{v => v}</For> as View));
		await test("<Index>", viewCompatTest(proxy => <Index each={proxy}>{v => v}</Index> as View));
	});

	function assertEntries<T>(targets: T[][], entries: T[]) {
		for (const target of targets) {
			strictEqual(target.length, entries.length);
			deepStrictEqual(Array.from(target), entries);
			for (let i = 0; i < entries.length; i++) {
				strictEqual(i in target, true);
				strictEqual(target[i], entries[i]);
			}
		}
	}
});
