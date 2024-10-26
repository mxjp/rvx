import { strictEqual } from "node:assert";
import test from "node:test";

import { uncapture, watch } from "rvx";
import { HashRouter } from "rvx/router";

import { assertEvents } from "../common.js";

let hash = "";
globalThis.location = {
	get hash() {
		return hash;
	},
	set hash(value) {
		hash = value;
		window.dispatchEvent(new CustomEvent("hashchange"));
	},
} as typeof globalThis.location;

await test("router/history router", () => {
	hash = "";

	const events: unknown[] = [];
	const router = uncapture(() => new HashRouter());
	strictEqual(router.root, router);
	strictEqual(router.parent, undefined);

	uncapture(() => {
		watch(() => [router.path, router.query] as const, ([path, query]) => {
			events.push([path, query?.raw]);
		});
	});

	assertEvents(events, [["", undefined]]);

	router.push("/a");
	assertEvents(events, [["/a", undefined]]);

	router.push("/b", "test=1");
	assertEvents(events, [["/b", "test=1"]]);

	router.replace("/c");
	assertEvents(events, [["/c", undefined]]);

	router.push("/d", { test: "2" });
	assertEvents(events, [["/d", "test=2"]]);

	location.hash = "#";
	assertEvents(events, [["", undefined]]);

	location.hash = "#foo";
	assertEvents(events, [["/foo", undefined]]);

	location.hash = "#/";
	assertEvents(events, [["", undefined]]);

	location.hash = "#/bar/baz";
	assertEvents(events, [["/bar/baz", undefined]]);

	location.hash = "#/?";
	assertEvents(events, [["", ""]]);

	location.hash = "#foo?test=1";
	assertEvents(events, [["/foo", "test=1"]]);

	location.hash = "#/bar/baz?test=2";
	assertEvents(events, [["/bar/baz", "test=2"]]);
});
