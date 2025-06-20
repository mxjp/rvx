import { strictEqual } from "node:assert";
import test from "node:test";
import { get } from "rvx";
import { string } from "rvx/convert";

await test("convert/string", () => {
	strictEqual(get(string(42)), "42");
	strictEqual(get(string(true)), "true");
	strictEqual(get(string(false)), "false");
	strictEqual(get(string(null)), "null");
	strictEqual(get(string(undefined)), "undefined");
});
