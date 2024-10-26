import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, Inject } from "rvx";

await suite("context", async () => {
	await test("usage", () => {
		const ctx = new Context<number>();
		strictEqual(ctx.current, undefined);
		strictEqual(ctx.inject(7, () => {
			strictEqual(ctx.current, 7);
			return 42;
		}), 42);
		strictEqual(ctx.current, undefined);
	});

	await test("instance args", () => {
		const ctx = new Context<number>();
		strictEqual(ctx.inject(42, (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("static args", () => {
		const ctx = new Context<number>();
		strictEqual(Context.inject([ctx.with(42)], (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("with", () => {
		const ctx = new Context<number>();
		deepStrictEqual(ctx.with(42), { context: ctx, value: 42 });
		strictEqual(ctx.current, undefined);
	});

	await test("window args", () => {
		strictEqual(Context.window([], (a: number, b: number) => a * b, 2, 3), 6);
	});

	await test("instance inject in empty window", () => {
		const ctx = new Context<number>();
		strictEqual(Context.window([], () => {
			strictEqual(ctx.current, undefined);
			strictEqual(ctx.inject(77, () => {
				strictEqual(ctx.current, 77);
				strictEqual(Context.window([], () => {
					strictEqual(ctx.current, undefined);
					ctx.inject(42, () => {
						strictEqual(ctx.current, 42);
					});
					return "c";
				}), "c");
				strictEqual(ctx.current, 77);
				return "b";
			}), "b");
			strictEqual(ctx.current, undefined);
			return "a";
		}), "a");
		strictEqual(ctx.current, undefined);
	});

	await test("static inject in empty window", () => {
		const ctx = new Context<number>();
		strictEqual(Context.window([], () => {
			strictEqual(ctx.current, undefined);
			strictEqual(Context.inject([ctx.with(77)], () => {
				strictEqual(ctx.current, 77);
				strictEqual(Context.window([], () => {
					strictEqual(ctx.current, undefined);
					strictEqual(Context.inject([ctx.with(42)], () => {
						strictEqual(ctx.current, 42);
						return "d";
					}), "d");
					return "c";
				}), "c");
				strictEqual(ctx.current, 77);
				return "b";
			}), "b");
			strictEqual(ctx.current, undefined);
			return "a";
		}), "a");
		strictEqual(ctx.current, undefined);
	});

	await test("instance inject through many windows", () => {
		const ctx = new Context<number>();
		Context.window([], () => {
			Context.window([], () => {
				ctx.inject(42, () => {
					strictEqual(ctx.current, 42);
				});
				strictEqual(ctx.current, undefined);
			});
			strictEqual(ctx.current, undefined);
		});
	});

	await test("static inject through many windows", () => {
		const ctx = new Context<number>();
		Context.window([], () => {
			Context.window([], () => {
				Context.inject([ctx.with(42)], () => {
					strictEqual(ctx.current, 42);
				});
				strictEqual(ctx.current, undefined);
			});
			strictEqual(ctx.current, undefined);
		});
	});

	await test("window", () => {
		const a = new Context<number>();
		const b = new Context<number>();
		a.inject(42, () => {
			strictEqual(a.current, 42);
			Context.window([a.with(7), b.with(77)], () => {
				strictEqual(a.current, 7);
				strictEqual(b.current, 77);
				a.inject(11, () => {
					strictEqual(a.current, 11);
					strictEqual(b.current, 77);
					Context.window([b.with(13)], () => {
						strictEqual(a.current, undefined);
						strictEqual(b.current, 13);
					});
					strictEqual(a.current, 11);
					strictEqual(b.current, 77);
				});
				strictEqual(a.current, 7);
				strictEqual(b.current, 77);
			});
			strictEqual(a.current, 42);
		});
	});

	await suite("wrap", async () => {
		await test("empty context", () => {
			const ctx = new Context<number>();
			const fn = Context.wrap(() => {
				strictEqual(ctx.current, undefined);
			});
			fn();
			ctx.inject(42, fn);
			Context.inject([ctx.with(77)], fn);
		});

		await test("args", () => {
			const fn = Context.wrap((a: number, b: number) => a * b);
			strictEqual(fn(2, 3), 6);
		});

		await test("instance inject", () => {
			const ctx = new Context<number>();
			const fn = ctx.inject(11, () => {
				return Context.wrap(() => {
					strictEqual(ctx.current, 11);
				});
			});
			fn();
			ctx.inject(42, fn);
			Context.inject([ctx.with(77)], fn);
		});

		await test("static inject", () => {
			const ctx = new Context<number>();
			const fn = Context.inject([ctx.with(11)], () => {
				return Context.wrap(() => {
					strictEqual(ctx.current, 11);
				});
			});
			fn();
			ctx.inject(42, fn);
			Context.inject([ctx.with(77)], fn);
		});

		await test("nested window with instance inject", () => {
			const ctx = new Context<number>();
			const fn = Context.window([ctx.with(17)], () => {
				return Context.window([], () => {
					return ctx.inject(11, () => {
						return Context.wrap(() => {
							strictEqual(ctx.current, 11);
						});
					});
				});
			});
			fn();
			ctx.inject(42, fn);
			Context.inject([ctx.with(77)], fn);
		});

		await test("nested window with static inject", () => {
			const ctx = new Context<number>();
			const fn = Context.window([ctx.with(17)], () => {
				return Context.window([], () => {
					return Context.inject([ctx.with(11)], () => {
						return Context.wrap(() => {
							strictEqual(ctx.current, 11);
						});
					});
				});
			});
			fn();
			ctx.inject(42, fn);
			Context.inject([ctx.with(77)], fn);
		});
	});

	await suite("inject component", async () => {
		await test("instance inject", () => {
			const a = new Context<number>();
			const b = new Context<number>();
			const result = a.inject(11, () => {
				strictEqual(a.current, 11);
				const result = <Inject context={b} value={42}>
					{() => {
						strictEqual(a.current, 11);
						strictEqual(b.current, 42);
						return 77;
					}}
				</Inject>;
				strictEqual(a.current, 11);
				strictEqual(b.current, undefined);
				return result;
			});
			strictEqual(result, 77);
		});

		await test("static inject", () => {
			const a = new Context<number>();
			const b = new Context<number>();
			const result = a.inject(11, () => {
				strictEqual(a.current, 11);
				const result = <Inject states={[b.with(42)]}>
					{() => {
						strictEqual(a.current, 11);
						strictEqual(b.current, 42);
						return 77;
					}}
				</Inject>;
				strictEqual(a.current, 11);
				strictEqual(b.current, undefined);
				return result;
			});
			strictEqual(result, 77);
		});
	});
});
