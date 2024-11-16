import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, Inject } from "rvx";

await suite("context", async () => {
	await test("usage", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(ctx.current, undefined);
		strictEqual(ctx.inject(7, () => {
			strictEqual(ctx.current, 7);
			return 42;
		}), 42);
		strictEqual(ctx.current, undefined);
	});

	await test("instance args", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(ctx.inject(42, (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("static args", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(Context.inject([ctx.with(42)], (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("with", () => {
		const ctx = new Context<number | undefined>();
		deepStrictEqual(ctx.with(42), { context: ctx, value: 42 });
		strictEqual(ctx.current, undefined);
	});

	await test("window args", () => {
		strictEqual(Context.window([], (a: number, b: number) => a * b, 2, 3), 6);
	});

	await test("instance inject in empty window", () => {
		const ctx = new Context<number | undefined>();
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
		const ctx = new Context<number | undefined>();
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
		const ctx = new Context<number | undefined>();
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
		const ctx = new Context<number | undefined>();
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
		const a = new Context<number | undefined>();
		const b = new Context<number | undefined>();
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

	await test("nested window overwrite unwinding", () => {
		const ctx = new Context<number | undefined>();
		ctx.inject(1, () => {
			strictEqual(ctx.current, 1);
			Context.window([ctx.with(2), ctx.with(3)], () => {
				strictEqual(ctx.current, 3);
			});
			strictEqual(ctx.current, 1);
		});
	});

	await suite("wrap", async () => {
		await test("empty context", () => {
			const ctx = new Context<number | undefined>();
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
			const ctx = new Context<number | undefined>();
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
			const ctx = new Context<number | undefined>();
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
			const ctx = new Context<number | undefined>();
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
			const ctx = new Context<number | undefined>();
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

		await test("nested overwrite unwinding", () => {
			const ctx = new Context<number | undefined>();
			ctx.inject(1, () => {
				ctx.inject(2, () => {
					const fn = Context.wrap(() => {
						strictEqual(ctx.current, 2);
					});

					fn();
					strictEqual(ctx.current, 2);

					Context.window([ctx.with(3), ctx.with(4)], () => {
						strictEqual(ctx.current, 4);
						fn();
						strictEqual(ctx.current, 4);
					});
				});
			});
		});
	});

	await suite("inject component", async () => {
		await test("instance inject", () => {
			const a = new Context<number | undefined>();
			const b = new Context<number | undefined>();
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
			const a = new Context<number | undefined>();
			const b = new Context<number | undefined>();
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

	await suite("default values", async () => {
		await test("null", () => {
			const ctx = new Context<number | null>(null);
			strictEqual(ctx.current, null);
			ctx.inject(42, () => {
				strictEqual(ctx.current, 42);
				ctx.inject(null, () => {
					strictEqual(ctx.current, null);
				});
				ctx.inject(undefined, () => {
					strictEqual(ctx.current, null);
				});
			});
		});

		await test("undefined", () => {
			const ctx = new Context<number | undefined>();
			strictEqual(ctx.current, undefined);
			ctx.inject(42, () => {
				strictEqual(ctx.current, 42);
				ctx.inject(null, () => {
					strictEqual(ctx.current, undefined);
				});
				ctx.inject(undefined, () => {
					strictEqual(ctx.current, undefined);
				});
			});
		});

		await test("optional value", () => {
			const ctx = new Context<number | undefined>(42);
			strictEqual(ctx.current, 42);
			ctx.inject(77, () => {
				strictEqual(ctx.current, 77);
				ctx.inject(null, () => {
					strictEqual(ctx.current, 42);
				});
				ctx.inject(undefined, () => {
					strictEqual(ctx.current, 42);
				});
			});
		});
	});
});
