import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { For, uncapture, View, watch } from "rvx";
import { ReactiveSet, wrap } from "rvx/store";
import { assertEvents, viewText } from "../common.js";
import { WrapTest } from "./common.js";

await suite("store/reactive-set", async () => {
	await test("inert usage", () => {
		const inner = new Set(["foo"]);
		const set = wrap(inner);
		strictEqual(set instanceof ReactiveSet, true);
		strictEqual(set instanceof Set, true);

		assertEntries([inner, set], ["foo"]);
		inner.add("bar");
		assertEntries([inner, set], ["foo", "bar"]);
		set.add("baz");
		assertEntries([inner, set], ["foo", "bar", "baz"]);
		inner.delete("foo");
		assertEntries([inner, set], ["bar", "baz"]);
		set.delete("bar");
		assertEntries([inner, set], ["baz"]);
		set.delete("bar");
		assertEntries([inner, set], ["baz"]);
		set.clear();
		assertEntries([inner, set], []);
	});

	await test("reactive usage", () => {
		const events: unknown[] = [];
		const inner = new Set(["foo"]);
		const set = wrap(inner);

		uncapture(() => {
			watch(() => set.size, value => {
				events.push(["size", value]);
			});
			watch(() => Array.from(set.entries()), value => {
				events.push(["entries", value]);
			});
			watch(() => Array.from(set.keys()), value => {
				events.push(["keys", value]);
			});
			watch(() => Array.from(set.values()), value => {
				events.push(["values", value]);
			});
			watch(() => Array.from(set), value => {
				events.push(["iterator", value]);
			});
			watch(() => {
				const entries: string[] = [];
				set.forEach(value => {
					entries.push(value);
				});
				return entries;
			}, value => {
				events.push(["forEach", value]);
			});
			for (const value of ["foo", "bar", "baz"]) {
				watch(() => set.has(value), has => {
					events.push(["has", value, has]);
				});
			}
		});

		assertEvents(events, [
			size(1),
			...iterators(["foo"]),
			has("foo", true),
			has("bar", false),
			has("baz", false),
		]);

		set.add("bar");
		assertEntries([inner], ["foo", "bar"]);
		assertEvents(events, [
			size(2),
			...iterators(["foo", "bar"]),
			has("bar", true),
		]);

		set.add("bar");
		assertEntries([inner], ["foo", "bar"]);
		assertEvents(events, iterators(["foo", "bar"]));

		set.delete("foo");
		assertEntries([inner], ["bar"]);
		assertEvents(events, [
			size(1),
			...iterators(["bar"]),
			has("foo", false),
		]);

		set.delete("foo");
		assertEvents(events, []);

		set.clear();
		assertEntries([inner], []);
		assertEvents(events, [
			size(0),
			...iterators([]),
			has("bar", false),
		]);

		set.clear();
		assertEntries([inner], []);
		assertEvents(events, iterators([]));
	});

	await test("conversion", () => {
		const inner = new Set([new WrapTest()]);
		const set = wrap(inner);
		set.add(new WrapTest());

		assertWrapped(inner, false);
		assertWrapped(set, true);

		function assertWrapped(target: Set<WrapTest>, wrapped: boolean) {
			strictEqual(Array.from(target.keys()).every(x => x.wrapped === wrapped), true);
			strictEqual(Array.from(target.values()).every(x => x.wrapped === wrapped), true);
			strictEqual(Array.from(target.entries()).every(x => x[1].wrapped === wrapped), true);
			strictEqual(Array.from(target).every(x => x.wrapped === wrapped), true);
			target.forEach(value => {
				strictEqual(value.wrapped, wrapped);
			});
		}
	});

	await test("view compat", async () => {
		const proxy = wrap(new Set<string>(["a"]));
		const view = uncapture(() => {
			return <For each={proxy}>{v => v}</For> as View;
		});
		strictEqual(viewText(view), "a");
		proxy.add("b");
		strictEqual(viewText(view), "ab");
		proxy.delete("a");
		strictEqual(viewText(view), "b");
	});

	function assertEntries<T>(targets: Set<T>[], entries: T[]) {
		for (const target of targets) {
			strictEqual(target.size, entries.length);
			for (const value of entries) {
				strictEqual(target.has(value), true);
			}
			deepStrictEqual(Array.from(target.keys()), entries);
			deepStrictEqual(Array.from(target.values()), entries);
			deepStrictEqual(Array.from(target.entries()), entries.map(e => [e, e]));
			deepStrictEqual(Array.from(target), entries);

			const forEachEntries: T[] = [];
			target.forEach((value, value2) => {
				strictEqual(value, value2);
				forEachEntries.push(value);
			});
			deepStrictEqual(forEachEntries, entries);
		}
	}

	function size(value: number) {
		return ["size", value];
	}

	function has(value: unknown, has: boolean) {
		return ["has", value, has];
	}

	function iterators(value: unknown[]) {
		return [
			["entries", value.map(e => [e, e])],
			["keys", value],
			["values", value],
			["iterator", value],
			["forEach", value],
		];
	}
});
