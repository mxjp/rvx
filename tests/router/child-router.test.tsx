import { strictEqual } from "node:assert";
import test from "node:test";
import { $, uncapture, watch } from "rvx";
import { ChildRouter, normalize } from "rvx/router";
import { assertEvents } from "../common.js";
import { TestRouter } from "./common.js";

await test("router/child router", async () => {
	const events: unknown[] = [];
	const root = new TestRouter(events);
	root.push("/test");
	events.length = 0;

	const path = $(normalize(""));
	const child = new ChildRouter(root, "/test", path);

	strictEqual(child.root, root);
	strictEqual(child.parent, root);

	uncapture(() => watch(() => [child.path, child.query] as const, ([path, query]) => {
		events.push([
			"update",
			path,
			query?.raw,
		]);
	}));
	assertEvents(events, [["update", "", undefined]]);

	child.push("foo");
	strictEqual(root.path, "/test/foo");
	assertEvents(events, [["push", "/test/foo", undefined]]);

	child.replace("bar");
	strictEqual(root.path, "/test/bar");
	assertEvents(events, [["replace", "/test/bar", undefined]]);

	child.push("a", "test=1");
	strictEqual(root.path, "/test/a");
	assertEvents(events, [["push", "/test/a", "test=1"], ["update", "", "test=1"]]);

	child.replace("b", "test=2");
	strictEqual(root.path, "/test/b");
	assertEvents(events, [["replace", "/test/b", "test=2"], ["update", "", "test=2"]]);

	path.value = normalize("/foo");
	strictEqual(child.path, "/foo");
	assertEvents(events, [["update", "/foo", "test=2"]]);

	path.value = normalize("/bar");
	strictEqual(child.path, "/bar");
	assertEvents(events, [["update", "/bar", "test=2"]]);
});
