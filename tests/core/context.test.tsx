import { strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";

import { ContextKey, deriveContext, extract, Inject, inject } from "rvx";

import { withMsg } from "../common.js";

await suite("context", async () => {
	await test("nesting", () => {
		strictEqual(extract("foo"), undefined);

		inject("foo", "bar", () => {
			strictEqual(extract("foo"), "bar");

			deriveContext(context => {
				strictEqual(extract("foo"), "bar");
				strictEqual(context.get("foo"), "bar");
				context.set("foo", "baz");
				strictEqual(extract("foo"), "baz");
			});

			strictEqual(extract("foo"), "bar");
		});

		strictEqual(extract("foo"), undefined);
	});

	await suite("typed keys", async () => {
		await test("usage", () => {
			const KEY_A = Symbol("a") as ContextKey<number>;
			const KEY_B = Symbol("b") as ContextKey<string>;
			deriveContext(context => {
				context.set(KEY_A, 42);
				context.set(KEY_B, "test");

				const a: number | undefined = extract(KEY_A);
				strictEqual(a, 42);

				const b: string | undefined = extract(KEY_B);
				strictEqual(b, "test");
			});
		});

		await test("inject undefined", () => {
			const KEY = Symbol("b") as ContextKey<string>;
			deriveContext(context => {
				context.set(KEY, undefined);
				strictEqual(extract(KEY), undefined);
			});
			inject(KEY, undefined, () => {
				strictEqual(extract(KEY), undefined);
			});
			<Inject key={KEY} value={undefined}>
				{() => {
					strictEqual(extract(KEY), undefined);
				}}
			</Inject>;
		});
	});

	await suite("error handling", async () => {
		await test("inject", () => {
			strictEqual(extract("foo"), undefined);
			inject("foo", "bar", () => {
				strictEqual(extract("foo"), "bar");
				throws(() => {
					inject("foo", "baz", () => {
						strictEqual(extract("foo"), "baz");
						throw new Error("test");
					});
				}, withMsg("test"));
				strictEqual(extract("foo"), "bar");
			});
			strictEqual(extract("foo"), undefined);
		});

		await test("deriveContext", async () => {
			strictEqual(extract("foo"), undefined);
			deriveContext(outer => {
				outer.set("foo", "bar");
				strictEqual(extract("foo"), "bar");
				throws(() => {
					deriveContext(inner => {
						inner.set("foo", "baz");
						outer.set("bar", "boo");
						strictEqual(extract("foo"), "baz");
						throw new Error("test");
					});
				}, withMsg("test"));
				strictEqual(extract("foo"), "bar");
				strictEqual(extract("bar"), "boo");
			});
			strictEqual(extract("foo"), undefined);
		});
	});
});
