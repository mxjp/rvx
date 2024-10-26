import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, ContextSnapshot, Enter, Inject } from "rvx";

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

			let snapshots!: ContextSnapshot<unknown>[];

			a.inject(1, () => {
				strictEqual(a.current, 1);
				snapshots = Context.capture();
			});

			strictEqual(a.current, undefined);
			Context.enter(snapshots, () => {
				strictEqual(a.current, 1);
				strictEqual(b.current, undefined);
			});
			strictEqual(a.current, undefined);

			b.inject(2, () => {
				strictEqual(a.current, undefined);
				strictEqual(b.current, 2);

				strictEqual(a.current, undefined);
				Context.enter(snapshots, () => {
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

				const snapshots = Context.capture();
				Context.enter(snapshots, () => {
					strictEqual(a.current, 1);
					strictEqual(b.current, undefined);
				});

				b.inject(2, () => {
					Context.enter(snapshots, () => {
						strictEqual(a.current, 1);
						strictEqual(b.current, undefined);
					});

					strictEqual(a.current, 1);
					strictEqual(b.current, 2);

					Context.enter(snapshots, () => {
						a.inject(3, () => {
							strictEqual(a.current, 3);
							strictEqual(b.current, undefined);
							b.inject(4, () => {
								strictEqual(a.current, 3);
								strictEqual(b.current, 4);
								Context.enter(snapshots, () => {
									strictEqual(a.current, 1);
									strictEqual(b.current, undefined);
								});
							});
						});

						Context.enter(snapshots, () => {
							strictEqual(a.current, 1);
							strictEqual(b.current, undefined);
						});
					});

					Context.enter(snapshots, () => {
						strictEqual(a.current, 1);
						strictEqual(b.current, undefined);
					});
				});

				Context.enter(snapshots, () => {
					strictEqual(a.current, 1);
					strictEqual(b.current, undefined);
				});
			});
		});

		await test("inert snapshot", () => {
			const snapshots = Context.capture();
			strictEqual(Context.enter(snapshots, () => 42), 42);
		});

		await test("wrap", () => {
			const ctx = new Context<number>();
			let snapshot!: (a: number, b: number) => number;
			ctx.inject(2, () => {
				snapshot = Context.wrap((a: number, b: number) => {
					return ctx.current! * a * b;
				});
				strictEqual(snapshot(3, 4), 24);
			});
			strictEqual(snapshot(5, 6), 60);
		});

		await test("enter, with", () => {
			const a = new Context<number>();
			const b = new Context<number>();
			Context.enter([
				a.with(1),
				b.with(2),
			], () => {
				strictEqual(a.current, 1);
				strictEqual(b.current, 2);
			});
		});

		await test("Inject", () => {
			const ctx = new Context<number>();
			const result = <Inject context={ctx} value={77}>
				{() => {
					strictEqual(ctx.current, 77);
					return 42;
				}}
			</Inject>;
			strictEqual(result, 42);
		});

		await test("Enter", () => {
			const a = new Context<number>();
			const b = new Context<number>();
			const result = <Enter context={[
				a.with(1),
				b.with(2),
			]}>
				{() => {
					strictEqual(a.current, 1);
					strictEqual(b.current, 2);
					return 42;
				}}
			</Enter>;
			strictEqual(result, 42);
		});
	});
});
