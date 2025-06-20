import { strictEqual } from "node:assert";
import test from "node:test";
import { get } from "rvx";
import { optionalString } from "rvx/convert";

await test("convert/optionalString", () => {
	strictEqual(get(optionalString(42)), "42");
	strictEqual(get(optionalString(true)), "true");
	strictEqual(get(optionalString(false)), "false");
	strictEqual(get(optionalString(null)), null);
	strictEqual(get(optionalString(undefined)), undefined);
});
