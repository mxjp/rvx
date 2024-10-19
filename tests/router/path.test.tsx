import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { join, normalize, relative } from "rvx/router";

await suite("router/path", async () => {
	await test("normalize", () => {
		strictEqual(normalize(""), "");
		strictEqual(normalize("/"), "");
		strictEqual(normalize("/", false), "");

		strictEqual(normalize("foo"), "/foo");
		strictEqual(normalize("/foo"), "/foo");

		strictEqual(normalize("foo/"), "/foo/");
		strictEqual(normalize("foo/", false), "/foo");
		strictEqual(normalize("/foo/"), "/foo/");
		strictEqual(normalize("/foo/", false), "/foo");
	});

	await test("join", () => {
		strictEqual(join("", ""), "");
		strictEqual(join("", "/"), "");
		strictEqual(join("", "/", false), "");
		strictEqual(join("/", ""), "");
		strictEqual(join("/", "/"), "");
		strictEqual(join("/", "/", false), "");

		strictEqual(join("foo", ""), "/foo");
		strictEqual(join("/foo", ""), "/foo");
		strictEqual(join("", "foo"), "/foo");
		strictEqual(join("", "/foo"), "/foo");
		strictEqual(join("foo/", ""), "/foo/");
		strictEqual(join("foo/", "", false), "/foo");
		strictEqual(join("/foo/", ""), "/foo/");
		strictEqual(join("/foo/", "", false), "/foo");

		strictEqual(join("", "foo/"), "/foo/");
		strictEqual(join("", "foo/", false), "/foo");
		strictEqual(join("", "/foo/"), "/foo/");
		strictEqual(join("", "/foo/", false), "/foo");

		strictEqual(join("foo", "bar"), "/foo/bar");
		strictEqual(join("foo", "/bar"), "/foo/bar");
		strictEqual(join("foo/", "bar"), "/foo/bar");
		strictEqual(join("/foo", "bar"), "/foo/bar");
		strictEqual(join("/foo", "/bar"), "/foo/bar");
		strictEqual(join("/foo/", "/bar"), "/foo/bar");

		strictEqual(join("foo", "bar/"), "/foo/bar/");
		strictEqual(join("foo", "bar/", false), "/foo/bar");
		strictEqual(join("foo", "/bar/"), "/foo/bar/");
		strictEqual(join("foo/", "bar/"), "/foo/bar/");
		strictEqual(join("/foo", "bar/"), "/foo/bar/");
		strictEqual(join("/foo", "/bar/"), "/foo/bar/");
		strictEqual(join("/foo/", "/bar/"), "/foo/bar/");
	});

	await test("relative", () => {
		strictEqual(relative("", ""), "");
		strictEqual(relative("", "/"), "");
		strictEqual(relative("/", ""), "");

		strictEqual(relative("/", "foo"), "/foo");
		strictEqual(relative("", "foo/bar"), "/foo/bar");

		strictEqual(relative("foo/", "foo/"), "");
		strictEqual(relative("foo/", "foo/", false), "");
		strictEqual(relative("foo/", "/foo"), "");
		strictEqual(relative("/foo", "foo/"), "");
		strictEqual(relative("/foo", "foo/", false), "");

		strictEqual(relative("foo", "foo/bar"), "/bar");
		strictEqual(relative("foo", "/foo/bar"), "/bar");
		strictEqual(relative("/foo", "foo/bar"), "/bar");
		strictEqual(relative("foo", "foo/bar/"), "/bar/");
		strictEqual(relative("foo", "foo/bar/", false), "/bar");
		strictEqual(relative("foo/", "foo/bar"), "/bar");

		strictEqual(relative("foo/bar", "foo/baz/boo"), "/../baz/boo");
		strictEqual(relative("foo/bar", "foo/bar/baz/boo"), "/baz/boo");

		strictEqual(relative("foo", "bar"), "/../bar");
		strictEqual(relative("foo/", "bar"), "/../bar");
		strictEqual(relative("foo", "foobar"), "/../foobar");
		strictEqual(relative("foo/", "foobar/"), "/../foobar/");
		strictEqual(relative("foo/", "foobar/", false), "/../foobar");
		strictEqual(relative("foo/bar", "baz/boo"), "/../../baz/boo");
	});
});
