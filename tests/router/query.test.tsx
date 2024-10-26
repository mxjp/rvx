import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { formatQuery, Query } from "rvx/router";

await suite("router/query", async () => {
	await test("format", () => {
		strictEqual(formatQuery(""), "");
		strictEqual(formatQuery("&"), "&");
		strictEqual(formatQuery(undefined), "");
		strictEqual(formatQuery([]), "");
		strictEqual(formatQuery({ foo: "bar" }), "foo=bar");
	});

	await test("raw", () => {
		strictEqual(new Query("&").raw, "&");
		strictEqual(new Query("foo").raw, "foo");
	});

	await test("params", () => {
		strictEqual(new Query("foo=bar").params.get("foo"), "bar");
	});
});
