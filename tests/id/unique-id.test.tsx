import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { uniqueId } from "rvx/id";

import { NEXT_ID } from "../../dist/es/id/internals.js";

await suite("uniqueId", async () => {
	await test("initial usage", () => {
		const first = uniqueId();
		const match = /^rvx_(\d+)$/.exec(first);
		if (!match) {
			throw new Error("invalid id format");
		}
		let counter = Number(match[1]);
		strictEqual(uniqueId(), `rvx_${++counter}`);
		strictEqual(uniqueId(), `rvx_${++counter}`);
	});

	await test("max safe int overflow", () => {
		const original = NEXT_ID.value;
		try {
			NEXT_ID.value = Number.MAX_SAFE_INTEGER - 2;
			strictEqual(uniqueId(), `rvx_${Number.MAX_SAFE_INTEGER - 2}`);
			strictEqual(uniqueId(), `rvx_${Number.MAX_SAFE_INTEGER - 1}`);
			strictEqual(typeof NEXT_ID.value, "number");

			strictEqual(uniqueId(), `rvx_${BigInt(Number.MAX_SAFE_INTEGER)}`);
			strictEqual(typeof NEXT_ID.value, "bigint");

			strictEqual(uniqueId(), `rvx_${BigInt(Number.MAX_SAFE_INTEGER) + 1n}`);
			strictEqual(uniqueId(), `rvx_${BigInt(Number.MAX_SAFE_INTEGER) + 2n}`);
			strictEqual(uniqueId(), `rvx_${BigInt(Number.MAX_SAFE_INTEGER) + 3n}`);
		} finally {
			NEXT_ID.value = original;
		}
	});
});
