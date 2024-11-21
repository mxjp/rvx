import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { ENV, uncapture, watch } from "rvx";
import { isRvxDom } from "rvx/dom";
import { HistoryRouter } from "rvx/router";
import { assertEvents } from "../common.js";

let locationPath = "/";
let locationSearch = "";

function setUrl(data: unknown, unused: unknown, url: unknown) {
	strictEqual(data, null);
	strictEqual(unused, "");
	strictEqual(typeof url, "string");
	const queryStart = (url as string).indexOf("?");
	if (queryStart < 0) {
		locationPath = url as string;
		locationSearch = "";
	} else {
		locationPath = (url as string).slice(0, queryStart);
		locationSearch = (url as string).slice(queryStart);
	}
}

ENV.default = Object.create(ENV.default);

Object.defineProperty(ENV.current, "history", {
	value: {
		pushState: setUrl,
		replaceState: setUrl,
	},
});

Object.defineProperty(ENV.current, "location", {
	value: {
		get pathname() {
			return locationPath;
		},
		get search() {
			return locationSearch;
		},
	} as typeof globalThis.location
});

await suite("router/history router", { skip: isRvxDom() }, async () => {
	await test("general usage", async () => {
		locationPath = "/";
		locationSearch = "";

		const events: unknown[] = [];
		const router = uncapture(() => new HistoryRouter());
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

		locationPath = "/e";
		locationSearch = "?test=3";
		ENV.current.window.dispatchEvent(new ENV.current.CustomEvent("popstate"));
		assertEvents(events, [["/e", "test=3"]]);

		locationPath = "/f";
		locationSearch = "?test=4";
		ENV.current.window.dispatchEvent(new ENV.current.CustomEvent("rvx:router:update"));
		assertEvents(events, [["/f", "test=4"]]);
	});

	await test("base path", async () => {
		locationPath = "/";
		locationSearch = "";

		const events: unknown[] = [];
		const router = uncapture(() => new HistoryRouter({ basePath: "foo/bar" }));

		uncapture(() => {
			watch(() => router.path, path => {
				events.push(path);
			});
		});

		assertEvents(events, ["/../.."]);

		for (const fn of ["push", "replace"] as const) {
			router[fn]("/test");
			strictEqual(locationPath, "/foo/bar/test");
			assertEvents(events, ["/test"]);

			router[fn]("/test/");
			strictEqual(locationPath, "/foo/bar/test/");
			assertEvents(events, ["/test/"]);

			router[fn]("foo/bar");
			strictEqual(locationPath, "/foo/bar/foo/bar");
			assertEvents(events, ["/foo/bar"]);
		}

		const router2 = uncapture(() => new HistoryRouter());
		router2.push("/test");
		strictEqual(locationPath, "/test");
		assertEvents(events, ["/../../test"]);

		router2.push("/foo/test/bar");
		strictEqual(locationPath, "/foo/test/bar");
		assertEvents(events, ["/../test/bar"]);
	});
});
