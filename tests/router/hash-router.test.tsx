import { strictEqual } from "node:assert";
import test from "node:test";
import { ENV, uncapture, watch } from "rvx";
import { HashRouter } from "rvx/router";
import { isRvxDom } from "../../dist/es/dom/env.js";
import { assertEvents } from "../common.js";

ENV.default = Object.create(ENV.default as object);

let hash = "";
Object.defineProperty(ENV.current, "location", {
	value: {
		get hash() {
			return hash;
		},
		set hash(value) {
			hash = value;
			ENV.current.window.dispatchEvent(new ENV.current.CustomEvent("hashchange"));
		},
	} as typeof globalThis.location,
});

await test("router/history router", { skip: isRvxDom() }, () => {
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

	ENV.current.location.hash = "#";
	assertEvents(events, [["", undefined]]);

	ENV.current.location.hash = "#foo";
	assertEvents(events, [["/foo", undefined]]);

	ENV.current.location.hash = "#/";
	assertEvents(events, [["", undefined]]);

	ENV.current.location.hash = "#/bar/baz";
	assertEvents(events, [["/bar/baz", undefined]]);

	ENV.current.location.hash = "#/?";
	assertEvents(events, [["", ""]]);

	ENV.current.location.hash = "#foo?test=1";
	assertEvents(events, [["/foo", "test=1"]]);

	ENV.current.location.hash = "#/bar/baz?test=2";
	assertEvents(events, [["/bar/baz", "test=2"]]);
});
