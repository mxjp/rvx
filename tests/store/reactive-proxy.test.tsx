import { deepStrictEqual, notStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";

import { For, uncapture, View, watch } from "rvx";
import { unwrap, wrap, wrapInstancesOf } from "rvx/store";

import { assertEvents, text } from "../common.js";
import { WrapTest } from "./common.js";

await suite("store/reactive-proxy", async () => {
	await test("inert usage", () => {
		const inner: Partial<Record<string, number>> = { foo: 7 };
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);
		assertEntries([inner, proxy], [
			["foo", 7],
		]);

		inner.bar = 42;
		assertEntries([inner, proxy], [["foo", 7], ["bar", 42]]);

		proxy.baz = 77;
		assertEntries([inner, proxy], [["foo", 7], ["bar", 42], ["baz", 77]]);

		delete inner.foo;
		assertEntries([inner, proxy], [["bar", 42], ["baz", 77]]);

		delete proxy.bar;
		assertEntries([inner, proxy], [["baz", 77]]);

		delete proxy.bar;
		assertEntries([inner, proxy], [["baz", 77]]);
	});

	await test("reactive usage", () => {
		const events: unknown[] = [];
		const inner: Partial<Record<string, number>> = { foo: 7 };
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);

		uncapture(() => {
			watch(() => Object.entries(proxy), value => {
				events.push(["entries", value]);
			});
			watch(() => Object.keys(proxy), value => {
				events.push(["keys", value]);
			});
			watch(() => Object.values(proxy), value => {
				events.push(["values", value]);
			});
			watch(() => {
				const entries: [string, unknown][] = [];
				for (const key in proxy) {
					entries.push([key, proxy[key]]);
				}
				return entries;
			}, value => {
				events.push(["iterator", value]);
			});
			for (const key of ["foo", "bar", "baz"]) {
				watch(() => proxy[key], value => {
					events.push(["get", key, value]);
				});
				watch(() => key in proxy, value => {
					events.push(["has", key, value]);
				});
			}
		});

		assertEvents(events, [
			...iterators([["foo", 7]]),
			...added("foo", 7),
			...missing("bar"),
			...missing("baz"),
		]);

		proxy.bar = 42;
		assertEntries([inner], [["foo", 7], ["bar", 42]]);
		assertEvents(events, [
			...iterators([["foo", 7], ["bar", 42]]),
			...added("bar", 42),
		]);

		proxy.bar = 144;
		assertEntries([inner], [["foo", 7], ["bar", 144]]);
		assertEvents(events, [
			...iterators([["foo", 7], ["bar", 144]]),
			...value("bar", 144),
		]);

		delete proxy.foo;
		assertEntries([inner], [["bar", 144]]);
		assertEvents(events, [
			...iterators([["bar", 144]]),
			...missing("foo"),
		]);

		delete proxy.foo;
		assertEvents(events, iterators([["bar", 144]]));
	});

	await test("functions & props & private fields", () => {
		const events: unknown[] = [];

		class Test {
			static {
				wrapInstancesOf(this);
			}

			#private = 7;
			value = 1;

			updatePrivate() {
				unwrap(this).#private++;
			}

			updateValue() {
				this.value++;
			}

			get computed() {
				return unwrap(this).#private * this.value;
			}

			get noop() {
				return "test";
			}

			set noop(value: string) {
				events.push(["noop in", value]);
			}
		}

		const inner = new Test();
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);
		strictEqual(proxy instanceof Test, true);

		uncapture(() => {
			watch(() => proxy.value, value => {
				events.push(["value", value]);
			});
			watch(() => proxy.computed, value => {
				events.push(["computed", value]);
			});
			watch(() => proxy.noop, value => {
				events.push(["noop out", value]);
			});
		});

		assertEvents(events, [
			["value", 1],
			["computed", 7],
			["noop out", "test"],
		]);

		proxy.updatePrivate();
		assertEvents(events, []);
		strictEqual(inner.computed, 8);

		proxy.updateValue();
		assertEvents(events, [
			["value", 2],
			["computed", 16],
		]);
		strictEqual(inner.computed, 16);

		throws(() => {
			(proxy as unknown as Record<string, unknown>).computed = 42;
		});
		assertEvents(events, []);

		proxy.noop = "foo";
		assertEvents(events, [["noop in", "foo"]]);

		proxy.updatePrivate = () => {};
		proxy.updateValue = () => {};
		assertEvents(events, []);
	});

	await test("conversion", () => {
		const inner: Record<string, WrapTest> = { foo: new WrapTest() };
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);
		proxy.bar = new WrapTest();
		proxy.baz = new WrapTest();

		assertWrapped(inner, false);
		assertWrapped(proxy, true);

		function assertWrapped(target: Record<string, WrapTest>, wrapped: boolean) {
			strictEqual(Object.values(target).every(x => x.wrapped === wrapped), true);
			strictEqual(Object.entries(target).every(x => x[1].wrapped === wrapped), true);
		}
	});

	await test("view compat", () => {
		const proxy = wrap<Record<string, number>>({ foo: 0 });
		const view = uncapture(() => {
			return <For each={() => Object.entries(proxy)}>{v => `(${v[0]}:${v[1]})`}</For> as View;
		});
		strictEqual(text(view.take()), "(foo:0)");
		proxy.foo = 1;
		strictEqual(text(view.take()), "(foo:1)");
		proxy.bar = 2;
		strictEqual(text(view.take()), "(foo:1)(bar:2)");
		delete proxy.foo;
		strictEqual(text(view.take()), "(bar:2)");
	});

	function assertEntries<T extends object>(targets: T[], entries: [keyof T, T[keyof T]][]) {
		for (const target of targets) {
			for (const [prop, value] of entries) {
				strictEqual(target[prop], value);
				strictEqual(prop in target, true);
			}
			deepStrictEqual(Object.keys(target), entries.map(e => e[0]));
			deepStrictEqual(Object.values(target), entries.map(e => e[1]));
			deepStrictEqual(Object.entries(target), entries);
		}
	}

	function iterators(entries: [unknown, unknown][]) {
		return [
			["entries", entries],
			["keys", entries.map(e => e[0])],
			["values", entries.map(e => e[1])],
			["iterator", entries],
		];
	}

	function value(key: unknown, value: unknown) {
		return [
			["get", key, value],
		];
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
});
