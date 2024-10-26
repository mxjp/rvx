import { deepStrictEqual, strictEqual } from "node:assert";
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

	await test("from", () => {
		strictEqual(Query.from(undefined), undefined);
		{
			const q = Query.from("&foo")!;
			strictEqual(q.raw, "&foo");
			strictEqual(q.params.toString(), "foo=");
		}
		{
			const q = Query.from({ foo: "bar" })!;
			strictEqual(q.raw, "foo=bar");
			strictEqual(q.params.toString(), "foo=bar");
		}
	})

	await test("raw", () => {
		strictEqual(new Query("&").raw, "&");
		strictEqual(new Query("foo").raw, "foo");
	});

	await test("params", () => {
		strictEqual(new Query("foo=bar").params.get("foo"), "bar");
	});
});
