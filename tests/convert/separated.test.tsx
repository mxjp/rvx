import { strictEqual } from "node:assert";
import test from "node:test";
import { Expression, get } from "rvx";
import { separated } from "rvx/convert";

await test("convert/separated", () => {
	strictEqual(get(separated(42)), 42);
	strictEqual(get(separated([1, 2, 3])), "1 2 3");
	strictEqual(get(separated([1, 2, 3], ",")), "1,2,3");

	// Don't remove, only for testing the type:
	const _0: Expression<42> = separated(42);
	const _1: Expression<42 | string> = separated(42);
	const _2: Expression<42 | string> = separated([1, 2, 3] as (42 | unknown[]));
	const _3: Expression<string> = separated([1, 2, 3] as unknown[]);
});
