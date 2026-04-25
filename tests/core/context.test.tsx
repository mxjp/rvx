import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, Provide } from "rvx";

await suite("context", async () => {
	await test("usage", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(ctx.current, undefined);
		strictEqual(ctx.provide(7, () => {
			strictEqual(ctx.current, 7);
			return 42;
		}), 42);
		strictEqual(ctx.current, undefined);
	});

	await test("instance args", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(ctx.provide(42, (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("static args", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(Context.provide([ctx.with(42)], (a: number, b: number) => {
			return ctx.current! + a * b;
		}, 2, 3), 48);
	});

	await test("with", () => {
		const ctx = new Context<number | undefined>();
		deepStrictEqual(ctx.with(42), { c: ctx, v: 42 });
		strictEqual(ctx.current, undefined);
	});

	await test("window args", () => {
		strictEqual(Context.isolate([], (a: number, b: number) => a * b, 2, 3), 6);
	});

	await test("instance provide in empty window", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(Context.isolate([], () => {
			strictEqual(ctx.current, undefined);
			strictEqual(ctx.provide(77, () => {
				strictEqual(ctx.current, 77);
				strictEqual(Context.isolate([], () => {
					strictEqual(ctx.current, undefined);
					ctx.provide(42, () => {
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

	await test("static provide in empty window", () => {
		const ctx = new Context<number | undefined>();
		strictEqual(Context.isolate([], () => {
			strictEqual(ctx.current, undefined);
			strictEqual(Context.provide([ctx.with(77)], () => {
				strictEqual(ctx.current, 77);
				strictEqual(Context.isolate([], () => {
					strictEqual(ctx.current, undefined);
					strictEqual(Context.provide([ctx.with(42)], () => {
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

	await test("instance provide through many windows", () => {
		const ctx = new Context<number | undefined>();
		Context.isolate([], () => {
			Context.isolate([], () => {
				ctx.provide(42, () => {
					strictEqual(ctx.current, 42);
				});
				strictEqual(ctx.current, undefined);
			});
			strictEqual(ctx.current, undefined);
		});
	});

	await test("static provide through many windows", () => {
		const ctx = new Context<number | undefined>();
		Context.isolate([], () => {
			Context.isolate([], () => {
				Context.provide([ctx.with(42)], () => {
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
		a.provide(42, () => {
			strictEqual(a.current, 42);
			Context.isolate([a.with(7), b.with(77)], () => {
				strictEqual(a.current, 7);
				strictEqual(b.current, 77);
				a.provide(11, () => {
					strictEqual(a.current, 11);
					strictEqual(b.current, 77);
					Context.isolate([b.with(13)], () => {
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
		ctx.provide(1, () => {
			strictEqual(ctx.current, 1);
			Context.isolate([ctx.with(2), ctx.with(3)], () => {
				strictEqual(ctx.current, 3);
			});
			strictEqual(ctx.current, 1);
		});
	});

	await suite("wrap", async () => {
		await test("empty context", () => {
			const ctx = new Context<number | undefined>();
			const fn = Context.bind(() => {
				strictEqual(ctx.current, undefined);
			});
			fn();
			ctx.provide(42, fn);
			Context.provide([ctx.with(77)], fn);
		});

		await test("args", () => {
			const fn = Context.bind((a: number, b: number) => a * b);
			strictEqual(fn(2, 3), 6);
		});

		await test("instance provide", () => {
			const ctx = new Context<number | undefined>();
			const fn = ctx.provide(11, () => {
				return Context.bind(() => {
					strictEqual(ctx.current, 11);
				});
			});
			fn();
			ctx.provide(42, fn);
			Context.provide([ctx.with(77)], fn);
		});

		await test("static provide", () => {
			const ctx = new Context<number | undefined>();
			const fn = Context.provide([ctx.with(11)], () => {
				return Context.bind(() => {
					strictEqual(ctx.current, 11);
				});
			});
			fn();
			ctx.provide(42, fn);
			Context.provide([ctx.with(77)], fn);
		});

		await test("nested window with instance provide", () => {
			const ctx = new Context<number | undefined>();
			const fn = Context.isolate([ctx.with(17)], () => {
				return Context.isolate([], () => {
					return ctx.provide(11, () => {
						return Context.bind(() => {
							strictEqual(ctx.current, 11);
						});
					});
				});
			});
			fn();
			ctx.provide(42, fn);
			Context.provide([ctx.with(77)], fn);
		});

		await test("nested window with static provide", () => {
			const ctx = new Context<number | undefined>();
			const fn = Context.isolate([ctx.with(17)], () => {
				return Context.isolate([], () => {
					return Context.provide([ctx.with(11)], () => {
						return Context.bind(() => {
							strictEqual(ctx.current, 11);
						});
					});
				});
			});
			fn();
			ctx.provide(42, fn);
			Context.provide([ctx.with(77)], fn);
		});

		await test("nested overwrite unwinding", () => {
			const ctx = new Context<number | undefined>();
			ctx.provide(1, () => {
				ctx.provide(2, () => {
					const fn = Context.bind(() => {
						strictEqual(ctx.current, 2);
					});

					fn();
					strictEqual(ctx.current, 2);

					Context.isolate([ctx.with(3), ctx.with(4)], () => {
						strictEqual(ctx.current, 4);
						fn();
						strictEqual(ctx.current, 4);
					});
				});
			});
		});
	});

	await suite("provide component", async () => {
		await test("instance provide", () => {
			const a = new Context<number | undefined>();
			const b = new Context<number | undefined>();
			const result = a.provide(11, () => {
				strictEqual(a.current, 11);
				const result = <Provide context={b} value={42}>
					{() => {
						strictEqual(a.current, 11);
						strictEqual(b.current, 42);
						return 77;
					}}
				</Provide>;
				strictEqual(a.current, 11);
				strictEqual(b.current, undefined);
				return result;
			});
			strictEqual(result, 77);
		});

		await test("static provide", () => {
			const a = new Context<number | undefined>();
			const b = new Context<number | undefined>();
			const result = a.provide(11, () => {
				strictEqual(a.current, 11);
				const result = <Provide states={[b.with(42)]}>
					{() => {
						strictEqual(a.current, 11);
						strictEqual(b.current, 42);
						return 77;
					}}
				</Provide>;
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
			ctx.provide(42, () => {
				strictEqual(ctx.current, 42);
				ctx.provide(null, () => {
					strictEqual(ctx.current, null);
				});
				ctx.provide(undefined, () => {
					strictEqual(ctx.current, null);
				});
			});
		});

		await test("undefined", () => {
			const ctx = new Context<number | undefined>();
			strictEqual(ctx.current, undefined);
			ctx.provide(42, () => {
				strictEqual(ctx.current, 42);
				ctx.provide(null, () => {
					strictEqual(ctx.current, undefined);
				});
				ctx.provide(undefined, () => {
					strictEqual(ctx.current, undefined);
				});
			});
		});

		await test("optional value", () => {
			const ctx = new Context<number | undefined>(42);
			strictEqual(ctx.current, 42);
			ctx.provide(77, () => {
				strictEqual(ctx.current, 77);
				ctx.provide(null, () => {
					strictEqual(ctx.current, 42);
				});
				ctx.provide(undefined, () => {
					strictEqual(ctx.current, 42);
				});
			});
		});
	});
});
