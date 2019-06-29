import test from "ava";
import { MapProxy, SetProxy } from "../src";
import { capture } from "./_utility";

test("set instance", t => {
	const set = new SetProxy();
	t.true(set instanceof Set);
	t.false(set instanceof SetProxy);
});

test("set events", t => {
	const set = new SetProxy(new Set(["foo"]));
	const { events } = capture(set);

	set.add("bar");
	set.add("baz");

	set.delete("foo");
	set.delete("bar");

	t.deepEqual(events, [
		{ resolve: { start: 0, count: 0, items: ["foo"] } },
		{ resolve: { start: 1, count: 0, items: ["bar"] } },
		{ resolve: { start: 2, count: 0, items: ["baz"] } },
		{ resolve: { start: 0, count: 1, items: [] } },
		{ resolve: { start: 0, count: 1, items: [] } }
	]);
});

test("set entries", t => {
	const set = new SetProxy<string>();
	const { events } = capture(set.entry("foo"));
	t.deepEqual(events, [
		{ resolve: false }
	]);
	events.length = 0;

	set.add("foo");
	set.add("bar");
	set.delete("foo");
	t.deepEqual(events, [
		{ resolve: true },
		{ resolve: false }
	]);
	events.length = 0;

	set.add("foo");
	set.clear();
	t.deepEqual(events, [
		{ resolve: true },
		{ resolve: false }
	]);
	events.length = 0;

	set.add("foo");
	set.entry("bar").subscribe();
	set.entry("baz").subscribe();
	set.clear();
	t.deepEqual(events, [
		{ resolve: true },
		{ resolve: false }
	]);
	events.length = 0;
});

test("map instance", t => {
	const map = new MapProxy();
	t.true(map instanceof Map);
	t.false(map instanceof MapProxy);
});

test("map events", t => {
	const map = new MapProxy(new Map([["foo", 42]]));
	const { events } = capture(map);

	map.set("bar", 17);
	map.set("baz", 3);

	map.delete("foo");
	map.delete("bar");

	t.deepEqual(events, [
		{ resolve: { start: 0, count: 0, items: [["foo", 42]] } },
		{ resolve: { start: 1, count: 0, items: [["bar", 17]] } },
		{ resolve: { start: 2, count: 0, items: [["baz", 3]] } },
		{ resolve: { start: 0, count: 1, items: [] } },
		{ resolve: { start: 0, count: 1, items: [] } }
	]);
});

test("map entries", t => {
	const map = new MapProxy<string, number>();
	const { events } = capture(map.entry("foo"));
	t.deepEqual(events, [
		{ resolve: undefined }
	]);
	events.length = 0;

	map.set("bar", 7);
	map.set("foo", 42);
	map.delete("foo");
	t.deepEqual(events, [
		{ resolve: 42 },
		{ resolve: undefined }
	]);
	events.length = 0;

	map.set("foo", 17);
	map.clear();
	t.deepEqual(events, [
		{ resolve: 17 },
		{ resolve: undefined }
	]);
	events.length = 0;

	map.set("foo", 31);
	map.entry("bar").subscribe();
	map.entry("baz").subscribe();
	map.clear();
	t.deepEqual(events, [
		{ resolve: 31 },
		{ resolve: undefined }
	]);
});
