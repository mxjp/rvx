import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { For, uncapture, View, watch } from "rvx";
import { ReactiveMap, wrap } from "rvx/store";
import { assertEvents, viewText } from "../common.js";
import { WrapTest } from "./common.js";

await suite("store/reactive-map", async () => {
	await test("inert usage", () => {
		const inner = new Map<string, number>([["foo", 7]]);
		const map = wrap(inner);
		strictEqual(map instanceof ReactiveMap, true);
		strictEqual(map instanceof Map, true);
		assertEntries([inner, map], [["foo", 7]]);

		inner.set("bar", 42);
		assertEntries([inner, map], [["foo", 7], ["bar", 42]]);

		map.set("baz", 77);
		assertEntries([inner, map], [["foo", 7], ["bar", 42], ["baz", 77]]);

		inner.delete("foo");
		assertEntries([inner, map], [["bar", 42], ["baz", 77]]);

		map.delete("bar");
		assertEntries([inner, map], [["baz", 77]]);

		map.clear();
		assertEntries([inner, map], []);
	});

	await test("reactive usage", () => {
		const events: unknown[] = [];
		const inner = new Map<string, number>([["foo", 7]]);
		const map = wrap(inner);

		uncapture(() => {
			watch(() => map.size, value => {
				events.push(["size", value]);
			});
			watch(() => Array.from(map.entries()), value => {
				events.push(["entries", value]);
			});
			watch(() => Array.from(map.keys()), value => {
				events.push(["keys", value]);
			});
			watch(() => Array.from(map.values()), value => {
				events.push(["values", value]);
			});
			watch(() => Array.from(map), value => {
				events.push(["iterator", value]);
			});
			watch(() => {
				const entries: [string, number][] = [];
				map.forEach((value, key) => {
					entries.push([key, value]);
				});
				return entries;
			}, value => {
				events.push(["forEach", value]);
			});
			for (const key of ["foo", "bar", "baz"]) {
				watch(() => map.get(key), value => {
					events.push(["get", key, value]);
				});
				watch(() => map.has(key), value => {
					events.push(["has", key, value]);
				});
			}
		});

		assertEvents(events, [
			size(1),
			...iterators([["foo", 7]]),
			...added("foo", 7),
			...missing("bar"),
			...missing("baz"),
		]);

		map.set("bar", 42);
		assertEntries([inner], [["foo", 7], ["bar", 42]]);
		assertEvents(events, [
			size(2),
			...iterators([["foo", 7], ["bar", 42]]),
			...added("bar", 42),
		]);

		map.set("bar", 144);
		assertEntries([inner], [["foo", 7], ["bar", 144]]);
		assertEvents(events, [
			...iterators([["foo", 7], ["bar", 144]]),
			value("bar", 144),
		]);

		map.delete("foo");
		assertEntries([inner], [["bar", 144]]);
		assertEvents(events, [
			size(1),
			...iterators([["bar", 144]]),
			...missing("foo"),
		]);

		map.delete("foo");
		assertEvents(events, []);

		map.clear();
		assertEntries([inner], []);
		assertEvents(events, [
			size(0),
			...iterators([]),
			...missing("bar"),
		]);

		map.clear();
		assertEntries([inner], []);
		assertEvents(events, iterators([]));
	});

	await test("conversion", () => {
		const inner = new Map([["foo", new WrapTest()]]);
		const map = wrap(inner);
		map.set("bar", new WrapTest());
		map.set("baz", wrap(new WrapTest()));

		assertWrapped(inner, false);
		assertWrapped(map, true);

		function assertWrapped(target: Map<string, WrapTest>, wrapped: boolean) {
			strictEqual(Array.from(target.values()).every(x => x.wrapped === wrapped), true);
			strictEqual(Array.from(target.entries()).every(x => x[1].wrapped === wrapped), true);
			strictEqual(Array.from(target).every(x => x[1].wrapped === wrapped), true);
			target.forEach(value => {
				strictEqual(value.wrapped, wrapped);
			});
		}
	});

	await test("view compat", async () => {
		const proxy = wrap(new Map<string, number>([["foo", 0]]));
		const view = uncapture(() => {
			return <For each={proxy}>{v => `(${v[0]}:${v[1]})`}</For> as View;
		});
		strictEqual(viewText(view), "(foo:0)");
		proxy.set("foo", 1);
		strictEqual(viewText(view), "(foo:1)");
		proxy.set("bar", 2);
		strictEqual(viewText(view), "(foo:1)(bar:2)");
		proxy.delete("foo");
		strictEqual(viewText(view), "(bar:2)");
	});

	function assertEntries<K, V>(targets: Map<K, V>[], entries: [K, V][]) {
		for (const target of targets) {
			strictEqual(target.size, entries.length);
			for (const [key, value] of entries) {
				strictEqual(target.get(key), value);
				strictEqual(target.has(key), true);
			}
			deepStrictEqual(Array.from(target.keys()), entries.map(e => e[0]));
			deepStrictEqual(Array.from(target.values()), entries.map(e => e[1]));
			deepStrictEqual(Array.from(target.entries()), entries);
			deepStrictEqual(Array.from(target), entries);

			const forEachEntries: [K, V][] = [];
			target.forEach((value, key) => {
				forEachEntries.push([key, value]);
			});
			deepStrictEqual(forEachEntries, entries);
		}
	}

	function size(value: number) {
		return ["size", value];
	}

	function value(key: unknown, value: unknown) {
		return ["get", key, value];
	}

	function added(key: unknown, value: unknown) {
		return [
			["get", key, value],
			["has", key, true],
		];
	}

	function missing(key: unknown) {
		return [
			["get", key, undefined],
			["has", key, false],
		];
	}

	function iterators(value: [unknown, unknown][]) {
		return [
			["entries", value],
			["keys", value.map(e => e[0])],
			["values", value.map(e => e[1])],
			["iterator", value],
			["forEach", value],
		];
	}
});
