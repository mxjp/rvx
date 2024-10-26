import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { uncapture, watch } from "rvx";
import { MemoryRouter } from "rvx/router";

import { assertEvents } from "../common.js";

await suite("router/memory router", async () => {
	await test("general usage", () => {
		const events: unknown[] = [];
		const router = uncapture(() => new MemoryRouter());
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
	});

	await test("initial state", () => {
		const router = uncapture(() => new MemoryRouter({
			path: "/foo/bar/",
			query: {
				foo: "1",
				bar: "2",
			},
		}));

		strictEqual(router.path, "/foo/bar/");
		strictEqual(router.query?.raw, "foo=1&bar=2");
	});
});
