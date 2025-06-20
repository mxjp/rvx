import { notStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { unwrap, wrap } from "rvx/store";

await suite("store/barrier", async () => {
	await test("non-reactive types", () => {
		class Test {}

		for (const value of [
			null,
			undefined,
			42,
			42n,
			true,
			false,
			new Test(),
		]) {
			strictEqual(value, wrap(value));
			strictEqual(value, unwrap(value));
		}
		strictEqual(Number.isNaN(wrap(NaN)), true);
	});

	await test("mapping", () => {
		const inner = {};
		const proxy = wrap(inner);
		notStrictEqual(inner, proxy);
		strictEqual(wrap(inner), proxy);
		strictEqual(wrap(proxy), proxy);
		strictEqual(unwrap(inner), inner);
		strictEqual(unwrap(proxy), inner);
	});
});
