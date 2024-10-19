import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { extract, Inject, sig, uncapture, watch } from "rvx";
import { ChildRouter, matchRoute, Route, ROUTER, Routes, watchRoutes } from "rvx/router";

import { assertEvents, lifecycleEvent, text } from "../common.js";
import { TestRouter } from "./common.js";

await suite("router/route", async () => {
	await test("match", async () => {
		function assert(
			route: Route,
			path: string,
			expected?: [path: string, rest: string, params?: unknown],
		) {
			const match = matchRoute(path, [route]);
			if (expected === undefined) {
				strictEqual(match, undefined);
			} else {
				strictEqual(match?.route, route, "route");
				strictEqual(match?.path, expected[0], "path");
				strictEqual(match?.rest, expected[1], "rest");
				if (route.match instanceof RegExp) {
					deepStrictEqual(route.match.exec(path), match?.params, "regexp match");
				} else {
					strictEqual(match?.params, expected[2], "params");
				}
			}
		}

		assert({}, "", ["", ""]);
		assert({}, "/foo", ["", "/foo"]);
		assert({}, "/foo/", ["", "/foo/"]);

		assert({ match: "" }, "", ["", ""]);
		assert({ match: "" }, "/foo");
		assert({ match: "/" }, "", ["", ""]);
		assert({ match: "/" }, "/foo");

		assert({ match: "/foo" }, "");
		assert({ match: "/foo" }, "/foo", ["/foo", ""]);
		assert({ match: "/foo" }, "/foo/");
		assert({ match: "/foo" }, "/foo/bar");

		assert({ match: "/foo/" }, "");
		assert({ match: "/foo/" }, "/foo", ["/foo", ""]);
		assert({ match: "/foo/" }, "/foo/", ["/foo", ""]);
		assert({ match: "/foo/" }, "/foo/bar", ["/foo", "/bar"]);
		assert({ match: "/foo/" }, "/foo/bar/", ["/foo", "/bar/"]);

		assert({ match: () => undefined }, "/foo");
		assert({ match: () => ({ path: "" }) }, "/foo", ["", "/foo"]);
		assert({ match: () => ({ path: "/foo" }) }, "/foo/bar", ["/foo", "/bar"]);
		assert({ match: () => ({ path: "/baz" }) }, "/foo", ["/baz", "/foo"]);
		assert({ match: () => ({ path: "/baz" }) }, "/foo/bar", ["/baz", "/foo/bar"]);
		assert({ match: () => ({ path: "", params: 42 }) }, "/foo", ["", "/foo", 42]);

		assert({ match: /foo/ }, "/foo", ["/foo", ""]);
		assert({ match: /^\/foo/ }, "/foo", ["/foo", ""]);
		assert({ match: /^\/foo/ }, "/foo/bar", ["/foo", "/bar"]);
		assert({ match: /^\/foo$/ }, "/foo", ["/foo", ""]);
		assert({ match: /^\/foo$/ }, "/foo/");
		assert({ match: /^\/foo$/ }, "/foo/bar");
		assert({ match: /^\/foo\// }, "/foo");
		assert({ match: /^\/foo\// }, "/foo/", ["/foo", ""]);
		assert({ match: /^\/foo\/$/ }, "/foo/bar");
		assert({ match: /^\/foo(?=\/bar$)/ }, "/foo");
		assert({ match: /^\/foo(?=\/bar$)/ }, "/foo/bar", ["/foo", "/bar"]);
	});

	await test("watch", () => {
		const events: unknown[] = [];
		const routes: Route[] = [
			{ match: "/" },
			{ match: /^\/foo(\/|$)/ },
		];

		const path = sig("");
		const watched = uncapture(() => watchRoutes(path, routes));
		uncapture(() => {
			watch(watched.match, () => events.push("match"));
			watch(watched.rest, () => events.push("rest"));
		});
		assertEvents(events, ["match", "rest"]);

		strictEqual(watched.match()?.route, routes[0]);
		strictEqual(watched.match()?.path, "");
		strictEqual(watched.match()?.params, undefined);
		strictEqual(watched.rest(), "");

		path.value = "/foo";
		assertEvents(events, ["match"]);
		strictEqual(watched.match()?.route, routes[1]);
		strictEqual(watched.match()?.path, "/foo");
		strictEqual(Array.isArray(watched.match()?.params), true);
		strictEqual(watched.rest(), "");

		path.value = "/foo/bar";
		assertEvents(events, ["rest"]);
		strictEqual(watched.rest(), "/bar");

		path.value = "/bar";
		assertEvents(events, ["match", "rest"]);
		strictEqual(watched.match(), undefined);
		strictEqual(watched.rest(), "");
	});

	await suite("routes", async () => {
		await test("matching", () => {
			const router = new TestRouter();
			const root = uncapture(() => <div>
				<Inject key={ROUTER} value={router}>
					{() => <Routes routes={[
						{ match: "/", content: () => <>a</> },
						{ match: "/b", content: () => <>b</> },
						{ match: "/b/", content: () => <>c</> },
						{ match: /^\/d-(\d+)(\/|$)/, content: props => {
							return <>d:{(props.params as RegExpExecArray)[1]}</>;
						} },
					]} />}
				</Inject>
			</div>) as HTMLDivElement;
			strictEqual(text(root), "a");
			for (const [path, expectedText] of [
				["/b", "b"],
				["/b/c", "c"],
				["/d-123", "d:123"],
				["/d-456/test", "d:456"],
				["/e", ""],
			] as [string, string][]) {
				router.push(path);
				strictEqual(text(root), expectedText);
			}
		});

		await test("lifecycle & child router", () => {
			const events: unknown[] = [];
			const router = new TestRouter();
			uncapture(() => <div>
				<Inject key={ROUTER} value={router}>
					{() => <Routes routes={[
						{ match: "/", content: () => lifecycleEvent(events, "a") },
						{ match: "/b", content: () => lifecycleEvent(events, "b") },
						{ match: "/c/", content: () => {
							lifecycleEvent(events, "c");
							const child = extract(ROUTER);
							strictEqual(child instanceof ChildRouter, true);
							watch(() => child!.path, path => events.push(path));
						} },
					]} />}
				</Inject>
			</div>) as HTMLDivElement;
			assertEvents(events, ["s:a"]);
			router.push("/b");
			assertEvents(events, ["e:a", "s:b"]);
			router.push("/c");
			assertEvents(events, ["e:b", "s:c", ""]);
			router.push("/c/");
			assertEvents(events, []);
			router.push("/c/foo");
			assertEvents(events, ["/foo"]);
			router.push("/c/bar/baz");
			assertEvents(events, ["/bar/baz"]);
			router.push("/d");
			assertEvents(events, ["e:c"]);
			router.push("/d/e");
			assertEvents(events, []);
		});
	});
});
