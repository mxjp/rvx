import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, ContextEntry } from "rvx";

await suite("context", async () => {
	await test("inject", () => {
		const ctx = new Context<number>();
		strictEqual(ctx.current, undefined);
		strictEqual(ctx.inject(1, () => {
			strictEqual(ctx.current, 1);

			ctx.inject(2, () => {
				strictEqual(ctx.current, 2);

				ctx.inject(undefined, () => {
					strictEqual(ctx.current, undefined);
				});
			});

			return 42;
		}), 42);
	});

	await suite("snapshot", async () => {
		await test("external reentry", () => {
			const a = new Context<number>();
			const b = new Context<number>();

			let snapshot!: ContextEntry;

			a.inject(1, () => {
				strictEqual(a.current, 1);
				snapshot = Context.capture();
			});

			strictEqual(a.current, undefined);
			snapshot(() => {
				strictEqual(a.current, 1);
				strictEqual(b.current, undefined);
			});
			strictEqual(a.current, undefined);

			b.inject(2, () => {
				strictEqual(a.current, undefined);
				strictEqual(b.current, 2);

				strictEqual(a.current, undefined);
				snapshot(() => {
					strictEqual(a.current, 1);
					strictEqual(b.current, undefined);
				});
				strictEqual(a.current, undefined);
			});
		});

		await test("nested reentry", () => {
			const a = new Context<number>();
			const b = new Context<number>();

			a.inject(1, () => {
				strictEqual(a.current, 1);

				const snapshot = Context.capture();
				snapshot(() => {
					strictEqual(a.current, 1);
					strictEqual(b.current, undefined);
				});

				b.inject(2, () => {
					snapshot(() => {
						strictEqual(a.current, 1);
						strictEqual(b.current, undefined);
					});

					strictEqual(a.current, 1);
					strictEqual(b.current, 2);

					snapshot(() => {
						a.inject(3, () => {
							strictEqual(a.current, 3);
							strictEqual(b.current, undefined);
							b.inject(4, () => {
								strictEqual(a.current, 3);
								strictEqual(b.current, 4);
								snapshot(() => {
									strictEqual(a.current, 1);
									strictEqual(b.current, undefined);
								});
							});
						});

						snapshot(() => {
							strictEqual(a.current, 1);
							strictEqual(b.current, undefined);
						});
					});

					snapshot(() => {
						strictEqual(a.current, 1);
						strictEqual(b.current, undefined);
					});
				});

				snapshot(() => {
					strictEqual(a.current, 1);
					strictEqual(b.current, undefined);
				});
			});
		});

		await test("inert snapshot", () => {
			const snapshot = Context.capture();
			strictEqual(snapshot(() => 42), 42);
		});

		await test("snapshot callback", () => {
			const ctx = new Context<number>();
			let snapshot!: (a: number, b: number) => number;
			ctx.inject(2, () => {
				snapshot = Context.capture((a: number, b: number) => {
					return ctx.current! * a * b;
				});
				strictEqual(snapshot(3, 4), 24);
			});
			strictEqual(snapshot(5, 6), 60);
		});
	});
});
