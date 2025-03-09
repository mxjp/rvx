import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";

import { $, batch, capture, Context, effect, get, isTracking, map, memo, optionalString, string, teardown, TeardownHook, track, trigger, TriggerPipe, uncapture, untrack, watch, watchUpdates } from "rvx";

import { assertEvents, lifecycleEvent, withMsg } from "../common.js";

await suite("signals", async () => {
	await test("inert usage", () => {
		const signal = $(42);
		strictEqual(signal.value, 42);

		signal.value = 7;
		strictEqual(signal.value, 7);

		const signal2 = $([1]);
		deepStrictEqual(signal2.value, [1]);

		signal2.update(value => {
			value.push(2);
		});
		deepStrictEqual(signal2.value, [1, 2]);

		signal.access();
		signal.notify();
	});

	await test("pipe", () => {
		const a = $(42);
		const c = a.pipe(b => {
			strictEqual(a, b);
			return 7;
		});
		strictEqual(c, 7);
	});

	await suite("immediate side effects", async () => {
		await test("watch", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				watch(signal, value => {
					lifecycleEvent(events, `${value}`);
					if (signal.value < 3) {
						signal.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "e:2", "s:3"]);
			dispose();
			assertEvents(events, ["e:3"]);
		});

		await test("watch (duplicate updates)", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				watch(signal, value => {
					lifecycleEvent(events, `${value}`);
					if (signal.value < 5) {
						signal.value++;
						signal.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:2", "e:2", "s:4", "e:4", "s:6"]);
			dispose();
			assertEvents(events, ["e:6"]);
		});

		await test("watch (multiple signals)", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $(0);
			const dispose = capture(() => {
				watch(() => a.value + b.value, value => {
					lifecycleEvent(events, `${value}`);
					if (value < 5) {
						a.value++;
						b.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:2", "e:2", "s:4", "e:4", "s:6"]);
			dispose();
			assertEvents(events, ["e:6"]);
		});

		await test("effect", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				effect(() => {
					lifecycleEvent(events, `${signal.value}`);
					if (signal.value < 3) {
						signal.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "e:2", "s:3"]);
			dispose();
			assertEvents(events, ["e:3"]);
		});

		await test("effect (duplicate updates)", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				effect(() => {
					lifecycleEvent(events, `${signal.value}`);
					if (signal.value < 5) {
						signal.value++;
						signal.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:2", "e:2", "s:4", "e:4", "s:6"]);
			dispose();
			assertEvents(events, ["e:6"]);
		});

		await test("effect (multiple signals)", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $(0);
			const dispose = capture(() => {
				effect(() => {
					const value = a.value + b.value;
					lifecycleEvent(events, `${value}`);
					if (value < 5) {
						a.value++;
						b.value++;
					}
				});
			});
			assertEvents(events, ["s:0", "e:0", "s:2", "e:2", "s:4", "e:4", "s:6"]);
			dispose();
			assertEvents(events, ["e:6"]);
		});

		await test("interleaved effect updates", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $();

			uncapture(() => {
				effect(() => {
					strictEqual(isTracking(), true);
					events.push(`a:${a.value}`);
					if (a.value < 3) {
						b.notify();
					}
					events.push("a:end");
				});
				assertEvents(events, ["a:0", "a:end"]);

				effect(() => {
					strictEqual(isTracking(), true);
					events.push(`b:start`);
					b.access();
					untrack(() => a.value++);
					events.push("b:end");
				});

				/* eslint-disable @typescript-eslint/indent */
				assertEvents(events, [
					"b:start",
						"a:1",
						// (notify b)
						"a:end",
					"b:end",
					"b:start",
						"a:2",
						// (notify b)
						"a:end",
					"b:end",
					"b:start",
						"a:3",
						"a:end",
					"b:end",
				]);
				/* eslint-enable @typescript-eslint/indent */
			});
		});

		await test("interleaved watch updates", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $();

			uncapture(() => {
				watch(() => {
					strictEqual(isTracking(), true);
					return a.value;
				}, value => {
					strictEqual(isTracking(), false);
					events.push(`a:${value}`);
					if (value < 3) {
						b.notify();
					}
					events.push("a:end");
				});
				assertEvents(events, ["a:0", "a:end"]);

				watch(() => {
					strictEqual(isTracking(), true);
					b.access();
				}, () => {
					strictEqual(isTracking(), false);
					events.push(`b:start`);
					b.access();
					untrack(() => a.value++);
					events.push("b:end");
				});

				/* eslint-disable @typescript-eslint/indent */
				assertEvents(events, [
					"b:start",
						"a:1",
						// (notify b)
						"a:end",
					"b:end",
					"b:start",
						"a:2",
						// (notify b)
						"a:end",
					"b:end",
					"b:start",
						"a:3",
						"a:end",
					"b:end",
				]);
				/* eslint-enable @typescript-eslint/indent */
			});
		});

		await test("effect self disposal", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				effect(() => {
					if (signal.value > 0) {
						const value = signal.value;
						events.push(`s:${value}`);
						signal.value++;
						if (value > 2) {
							events.push("dispose");
							dispose();
						}
						events.push(`e:${value}`);
					}
				});
			});
			assertEvents(events, []);
			signal.value = 1;
			assertEvents(events, [
				"s:1",
				"e:1",
				"s:2",
				"e:2",
				"s:3",
				"dispose",
				"e:3",
			]);
		});

		await test("watch self disposal", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const dispose = capture(() => {
				watch(signal, value => {
					if (value > 0) {
						events.push(`s:${value}`);
						signal.value++;
						if (value > 2) {
							events.push("dispose");
							dispose();
						}
						events.push(`e:${value}`);
					}
				});
			});
			assertEvents(events, []);
			signal.value = 1;
			assertEvents(events, [
				"s:1",
				"e:1",
				"s:2",
				"e:2",
				"s:3",
				"dispose",
				"e:3",
			]);
		});
	});

	await test("access cycles", () => {
		const a = $(false);
		const b = $(7);
		const events: unknown[] = [];

		strictEqual(isTracking(), false);
		uncapture(() => watch(() => {
			strictEqual(isTracking(), true);
			return a.value ? b.value : 0;
		}, value => {
			strictEqual(isTracking(), false);
			events.push(value);
		}));
		strictEqual(isTracking(), false);
		strictEqual(a.active, true);
		strictEqual(b.active, false);
		assertEvents(events, [0]);

		b.value = 3;
		strictEqual(a.active, true);
		strictEqual(b.active, false);
		assertEvents(events, []);

		a.value = true;
		strictEqual(a.active, true);
		strictEqual(b.active, true);
		assertEvents(events, [3]);

		b.value = 42;
		strictEqual(a.active, true);
		strictEqual(b.active, true);
		assertEvents(events, [42]);

		a.value = false;
		strictEqual(a.active, true);
		strictEqual(b.active, false);
		assertEvents(events, [0]);

		b.value = 2;
		strictEqual(a.active, true);
		strictEqual(b.active, false);
		assertEvents(events, []);

		a.value = true;
		strictEqual(a.active, true);
		strictEqual(b.active, true);
		assertEvents(events, [2]);
	});

	await test("same values", () => {
		const events: unknown[] = [];
		const signal = $(42);
		uncapture(() => watch(signal, value => {
			events.push(value);
		}));
		assertEvents(events, [42]);
		signal.value = 7;
		assertEvents(events, [7]);
		signal.value = 7;
		assertEvents(events, []);
		signal.value = NaN;
		assertEvents(events, [NaN]);
		signal.value = NaN;
		assertEvents(events, []);
	});

	await suite("watch", async () => {
		await test("static", () => {
			const events: unknown[] = [];
			strictEqual(isTracking(), false);
			watch(42, value => {
				events.push(value);
			});
			strictEqual(isTracking(), false);
			assertEvents(events, [42]);
		});

		await test("signal & dispose", () => {
			const events: unknown[] = [];
			const signal = $(42);
			strictEqual(signal.active, false);
			const dispose = capture(() => {
				strictEqual(isTracking(), false);
				watch(signal, value => {
					events.push(value);
				});
				strictEqual(isTracking(), false);
				strictEqual(signal.active, true);
			});
			assertEvents(events, [42]);

			signal.value = 7;
			strictEqual(signal.active, true);
			assertEvents(events, [7]);

			signal.value = 8;
			strictEqual(signal.active, true);
			assertEvents(events, [8]);

			dispose();
			strictEqual(signal.active, false);
			signal.value = 9;
			strictEqual(signal.active, false);
			assertEvents(events, []);
		});

		await test("function & batch", () => {
			const events: unknown[] = [];
			const a = $("a");
			const b = $(1);
			strictEqual(a.active, false);
			strictEqual(b.active, false);
			strictEqual(isTracking(), false);
			uncapture(() => watch(() => {
				strictEqual(isTracking(), true);
				return a.value + b.value;
			}, value => {
				strictEqual(isTracking(), false);
				events.push(value);
			}));
			strictEqual(isTracking(), false);
			strictEqual(a.active, true);
			strictEqual(b.active, true);
			assertEvents(events, ["a1"]);

			a.value = "b";
			strictEqual(a.active, true);
			assertEvents(events, ["b1"]);

			b.value = 2;
			strictEqual(b.active, true);
			assertEvents(events, ["b2"]);

			batch(() => {
				strictEqual(isTracking(), false);
				strictEqual(a.active, true);
				strictEqual(b.active, true);
				a.value = "c";
				b.value = 3;
				strictEqual(a.active, true);
				strictEqual(b.active, true);
				assertEvents(events, []);
				strictEqual(isTracking(), false);
			});
			strictEqual(a.active, true);
			strictEqual(b.active, true);
			assertEvents(events, ["c3"]);
			strictEqual(isTracking(), false);
		});

		await test("uncapture expression", () => {
			const events: unknown[] = [];
			const signal = $(42);
			uncapture(() => watch(() => {
				throws(() => {
					teardown(() => {});
				}, withMsg("G0"));
				uncapture(() => {
					teardown(() => {});
				});
				return signal.value;
			}, value => {
				events.push(value);
			}));
			assertEvents(events, [42]);

			const dispose = capture(() => {
				signal.value = 7;
				assertEvents(events, [7]);
			});
			assertEvents(events, []);
			dispose();
			assertEvents(events, []);
		});

		await test("capture callback", () => {
			const events: unknown[] = [];
			const signal = $(1);

			const dispose = capture(() => {
				watch(signal, value => {
					teardown(() => {
						events.push(`-${value}`);
					});
					events.push(`+${value}`);
				});
			});

			assertEvents(events, ["+1"]);

			signal.value = 2;
			assertEvents(events, ["-1", "+2"]);

			dispose();
			assertEvents(events, ["-2"]);

			signal.value = 3;
			assertEvents(events, []);
		});

		await test("teardown un-support", () => {
			const events: unknown[] = [];
			const signal = $(1);

			strictEqual(isTracking(), false);
			uncapture(() => watch(() => {
				strictEqual(isTracking(), true);

				throws(() => {
					teardown(() => {});
				}, withMsg("G0"));
				throws(() => {
					watch(() => {}, () => {});
				}, withMsg("G0"));
				throws(() => {
					watchUpdates(() => {}, () => {});
				}, withMsg("G0"));
				throws(() => {
					effect(() => {});
				}, withMsg("G0"));

				return signal.value;
			}, value => {
				strictEqual(isTracking(), false);
				events.push(value);
			}));
			strictEqual(isTracking(), false);

			assertEvents(events, [1]);
			signal.value = 2;
			assertEvents(events, [2]);
		});

		await test("access isolation (expr)", () => {
			const events: unknown[] = [];
			const outer = $(1);
			const inner = $(1);
			let innerHook: TeardownHook | undefined;
			uncapture(() => {
				watch(() => {
					events.push("o");
					innerHook?.();
					innerHook = capture(() => {
						strictEqual(isTracking(), true);
						watch(() => {
							strictEqual(isTracking(), true);
							events.push("i");
							return inner.value;
						}, value => {
							strictEqual(isTracking(), false);
							events.push(`i${value}`);
						});
					});
					return outer.value;
				}, value => {
					events.push(`o${value}`);
				});
			});
			assertEvents(events, ["o", "i", "i1", "o1"]);
			inner.value++;
			assertEvents(events, ["i", "i2"]);
			outer.value++;
			assertEvents(events, ["o", "i", "i2", "o2"]);
		});

		await test("access isolation (callback)", () => {
			const events: unknown[] = [];
			const outer = $(1);
			const inner = $(1);
			let innerHook: TeardownHook | undefined;
			uncapture(() => {
				watch(() => {
					events.push("o");
					innerHook?.();
					innerHook = capture(() => {
						strictEqual(isTracking(), true);
						watch(() => {
							strictEqual(isTracking(), true);
							events.push("i");
						}, () => {
							strictEqual(isTracking(), false);
							events.push(`i${inner.value}`);
						});
					});
					return outer.value;
				}, value => {
					events.push(`o${value}`);
				});
			});
			assertEvents(events, ["o", "i", "i1", "o1"]);
			inner.value++;
			assertEvents(events, []);
			outer.value++;
			assertEvents(events, ["o", "i", "i2", "o2"]);
		});

		await test("access isolation (teardown)", () => {
			const events: unknown[] = [];
			const outer = $(1);
			const inner = $(1);
			uncapture(() => {
				watch(inner, value => {
					strictEqual(isTracking(), false);
					events.push(`s${value}`);
					teardown(() => {
						strictEqual(isTracking(), false);
						events.push(`e${value}`);
					});
				}),
				watch(() => {
					strictEqual(isTracking(), true);
					events.push("o");
					inner.value = untrack(() => inner.value) + 1;
					return outer.value;
				}, value => {
					strictEqual(isTracking(), false);
					events.push(`o${value}`);
				});
			});
			assertEvents(events, ["s1", "o", "e1", "s2", "o1"]);
			outer.value++;
			assertEvents(events, ["o", "e2", "s3", "o2"]);
		});

		await test("re-entry tracking isolation", () => {
			const events: unknown[] = [];
			const signal = $();
			uncapture(() => {
				watch(() => {
					events.push("a");
					strictEqual(isTracking(), true);
					return signal.access();
				}, () => {
					strictEqual(isTracking(), false);
					events.push("b");
				});
				assertEvents(events, ["a", "b"]);
				watch(() => {
					strictEqual(isTracking(), true);
					untrack(() => {
						strictEqual(isTracking(), false);
						signal.notify();
						strictEqual(isTracking(), false);
					});
					strictEqual(isTracking(), true);
					assertEvents(events, ["a", "b"]);
				}, () => {});
				assertEvents(events, []);
			});
		});

		await test("context", () => {
			const events: unknown[] = [];
			const signal = $(1);

			const ctx = new Context<number | undefined>();
			ctx.inject(42, () => {
				uncapture(() => watch(() => {
					strictEqual(isTracking(), true);
					events.push(`e${ctx.current}`);
					strictEqual(isTracking(), true);
					signal.access();
				}, () => {
					events.push(`c${ctx.current}`);
				}));
			});

			assertEvents(events, ["e42", "c42"]);
			ctx.inject(7, () => {
				signal.notify();
			});
			assertEvents(events, ["e42", "c42"]);
		});

		for (const inExpr of [false, true]) {
			await suite(`${inExpr ? "expression" : "callback"} error handling`, async () => {
				await test("immediate, no access", () => {
					uncapture(() => {
						throws(() => {
							watch(() => {
								if (inExpr) {
									throw new Error("e");
								}
							}, () => {
								throw new Error("c");
							});
						}, withMsg(inExpr ? "e" : "c"));
					});
				});

				await test("immediate, access", () => {
					const events: unknown[] = [];
					const signal = $(42);
					const dispose = capture(() => {
						watch(signal, value => {
							events.push(`a${value}`);
						});

						throws(() => {
							watch(() => {
								signal.access();
								if (inExpr) {
									throw new Error("e");
								}
							}, () => {
								throw new Error("c");
							});
						}, withMsg(inExpr ? "e" : "c"));

						watch(signal, value => {
							events.push(`b${value}`);
						});

						assertEvents(events, ["a42", "b42"]);
					});

					throws(() => {
						signal.value = 77;
					}, withMsg(inExpr ? "e" : "c"));
					assertEvents(events, ["a77"]);

					throws(() => {
						signal.value = 11;
					}, withMsg(inExpr ? "e" : "c"));
					assertEvents(events, ["a11"]);

					dispose();
					signal.value = 123;
					assertEvents(events, []);
				});

				await test("deferred, access", () => {
					const events: unknown[] = [];
					const signal = $(42);

					const dispose = capture(() => {
						watch(() => {
							if (signal.value === 77 && inExpr) {
								throw new Error("e");
							}
							return signal.value;
						}, value => {
							if (value === 77) {
								throw new Error("c");
							}
							events.push(`v${value}`);
						});

						assertEvents(events, ["v42"]);
					});

					throws(() => {
						signal.value = 77;
					}, withMsg(inExpr ? "e" : "c"));

					assertEvents(events, []);

					signal.value = 123;
					assertEvents(events, ["v123"]);

					dispose();
					signal.value = 1234;
					assertEvents(events, []);
				});
			});
		}
	});

	await suite("effect", async () => {
		await test("normal usage", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const dispose = capture(() => {
				effect(() => {
					strictEqual(isTracking(), true);
					const value = signal.value;
					events.push(`s${value}`);
					teardown(() => {
						events.push(`e${value}`);
					});
				});
			});
			strictEqual(isTracking(), false);
			assertEvents(events, ["s1"]);
			signal.value++;
			assertEvents(events, ["e1", "s2"]);
			signal.value++;
			assertEvents(events, ["e2", "s3"]);
			dispose();
			assertEvents(events, ["e3"]);
			signal.value++;
			assertEvents(events, []);
		});

		await test("batch", () => {
			const events: unknown[] = [];
			const a = $("a");
			const b = $(1);
			uncapture(() => {
				effect(() => {
					events.push(`${a.value}${b.value}`);
				});
			});
			assertEvents(events, ["a1"]);
			batch(() => {
				a.value = "b";
				assertEvents(events, []);
				b.value++;
				assertEvents(events, []);
			});
			assertEvents(events, ["b2"]);
		});

		await test("access isolation (callback)", () => {
			const events: unknown[] = [];
			const outer = $(1);
			const inner = $(1);
			uncapture(() => {
				effect(() => {
					events.push(`o${outer.value}`);
					effect(() => {
						events.push(`i${inner.value}`);
					});
				});
			});
			assertEvents(events, ["o1", "i1"]);
			outer.value++;
			assertEvents(events, ["o2", "i1"]);
			inner.value++;
			assertEvents(events, ["i2"]);
			outer.value++;
			assertEvents(events, ["o3", "i2"]);
			inner.value++;
			assertEvents(events, ["i3"]);
		});

		await test("access isolation (teardown)", () => {
			const events: unknown[] = [];
			const outer = $(1);
			const inner = $(1);
			uncapture(() => {
				effect(() => {
					const value = inner.value;
					strictEqual(isTracking(), true);
					events.push(`s${value}`);
					teardown(() => {
						strictEqual(isTracking(), false);
						events.push(`e${value}`);
					});
				});
				effect(() => {
					strictEqual(isTracking(), true);
					events.push(`o${outer.value}`);
					inner.value = untrack(() => inner.value) + 1;
				});
			});
			assertEvents(events, ["s1", "o1", "e1", "s2"]);
			outer.value++;
			assertEvents(events, ["o2", "e2", "s3"]);
		});

		await test("re-entry tracking isolation", () => {
			const events: unknown[] = [];
			const signal = $();
			uncapture(() => {
				effect(() => {
					events.push("a");
					strictEqual(isTracking(), true);
					signal.access();
				});
				assertEvents(events, ["a"]);
				effect(() => {
					strictEqual(isTracking(), true);
					untrack(() => {
						strictEqual(isTracking(), false);
						signal.notify();
						strictEqual(isTracking(), false);
					});
					strictEqual(isTracking(), true);
					assertEvents(events, ["a"]);
				});
				assertEvents(events, []);
			});
		});

		await test("expected infinite loop", () => {
			let count = 0;
			const signal = $(0);
			uncapture(() => {
				effect(() => {
					if (count < 5) {
						count++;
						signal.value++;
					}
				});
			});
			strictEqual(count, 5);
		});

		await suite("error handling", async () => {
			await test("immediate, no access", () => {
				uncapture(() => {
					throws(() => {
						effect(() => {
							throw new Error("test");
						});
					}, withMsg("test"));
				});
			});

			await test("immediate, access", () => {
				const events: unknown[] = [];
				const signal = $(42);
				const dispose = capture(() => {
					effect(() => {
						events.push(`a${signal.value}`);
					});

					throws(() => {
						effect(() => {
							signal.access();
							throw new Error("test");
						});
					}, withMsg("test"));

					effect(() => {
						events.push(`b${signal.value}`);
					});

					assertEvents(events, ["a42", "b42"]);
				});

				throws(() => {
					signal.value = 77;
				}, withMsg("test"));
				assertEvents(events, ["a77"]);

				throws(() => {
					signal.value = 11;
				}, withMsg("test"));
				assertEvents(events, ["a11"]);

				dispose();
				signal.value = 123;
				assertEvents(events, []);
			});
		});
	});

	await test("watchUpdates", () => {
		const events: unknown[] = [];
		const signal = $("a");
		strictEqual(signal.active, false);
		const dispose = capture(() => {
			const first = watchUpdates(signal, value => {
				events.push(value);
			});
			strictEqual(signal.active, true);
			strictEqual(first, "a");
		});
		assertEvents(events, []);
		signal.value = "b";
		strictEqual(signal.active, true);
		assertEvents(events, ["b"]);
		signal.value = "c";
		strictEqual(signal.active, true);
		assertEvents(events, ["c"]);
		dispose();
		strictEqual(signal.active, false);
		signal.value = "d";
		strictEqual(signal.active, false);
		assertEvents(events, []);
	});

	await suite("tracking", async () => {
		await test("inert", () => {
			strictEqual(isTracking(), false);
			track(() => {
				strictEqual(isTracking(), false);
				untrack(() => {
					strictEqual(isTracking(), false);
					track(() => {
						strictEqual(isTracking(), false);
					});
				});
			});
		});

		await test("watch", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $(0);
			uncapture(() => watch(() => {
				strictEqual(isTracking(), true);
				const result = a.value + untrack(() => {
					strictEqual(isTracking(), false);
					track(() => {
						strictEqual(isTracking(), true);
					});
					return b.value;
				});
				strictEqual(isTracking(), true);
				return result;
			}, value => {
				events.push(value);
			}));
			assertEvents(events, [0]);
			a.value++;
			assertEvents(events, [1]);
			b.value++;
			assertEvents(events, []);
			a.value++;
			assertEvents(events, [3]);
		});
	});

	await suite("memo", async () => {
		await test("watch", () => {
			const events: unknown[] = [];
			const signal = $(1);
			strictEqual(signal.active, false);
			strictEqual(isTracking(), false);

			uncapture(() => watch(memo(() => {
				strictEqual(isTracking(), true);
				events.push("e");
				return signal.value;
			}), value => {
				strictEqual(isTracking(), false);
				events.push(value);
			}));
			strictEqual(signal.active, true);

			assertEvents(events, ["e", 1]);
			signal.value = 2;
			strictEqual(signal.active, true);
			assertEvents(events, ["e", 2]);
			signal.notify();
			strictEqual(signal.active, true);
			assertEvents(events, ["e"]);
		});

		await test("dispose", () => {
			const signal = $(1);

			let memoized!: () => number;
			const dispose = capture(() => {
				memoized = memo(signal);
				strictEqual(signal.active, true);
			});
			strictEqual(memoized(), 1);
			signal.value = 2;
			strictEqual(signal.active, true);
			strictEqual(memoized(), 2);

			dispose();
			strictEqual(signal.active, false);
			signal.value = 3;
			strictEqual(signal.active, false);
			strictEqual(memoized(), 2);
		});

		for (const useBatch of [false, true]) {
			const batchType = useBatch ? "batch" : "non-batch";

			await test(`${batchType} + memos + non-memos in same observer`, () => {
				const events: unknown[] = [];
				const signal = $(1);
				const computed = uncapture(() => memo(() => signal.value * 2));
				uncapture(() => watch(() => [signal.value, computed()], value => {
					events.push(value);
				}));
				assertEvents(events, [[1, 2]]);
				if (useBatch) {
					batch(() => {
						signal.value++;
						assertEvents(events, []);
					});
				} else {
					signal.value++;
				}
				assertEvents(events, useBatch ? [[2, 4]] : [[2, 4], [2, 4]]);
			});

			await test(`${batchType} + memos + non-memos in distinct observers`, () => {
				const events: unknown[] = [];
				const signal = $(1);
				const computed = uncapture(() => memo(() => signal.value * 2));
				uncapture(() => watch(() => signal.value, value => {
					events.push(["signal", value]);
				}));
				uncapture(() => watch(computed, value => {
					events.push(["memo", value]);
				}));
				assertEvents(events, [["signal", 1], ["memo", 2]]);
				if (useBatch) {
					batch(() => {
						signal.value++;
						assertEvents(events, []);
					});
				} else {
					signal.value++;
				}
				assertEvents(events.toSorted(), [["memo", 4], ["signal", 2]]);
			});
		}

		await test("batch & nested memos", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const inner = uncapture(() => memo(() => {
				events.push("i");
				return signal.value * 2;
			}));
			const outer = uncapture(() => memo(() => {
				events.push("o");
				return signal.value + inner();
			}));

			uncapture(() => watch(outer, value => {
				events.push(value);
			}));

			assertEvents(events, ["i", "o", 3]);
			signal.value = 2;
			assertEvents(events, ["i", "o", 6, "o"]);

			batch(() => {
				signal.value = 3;
				assertEvents(events, []);
			});
			assertEvents(events, ["i", "o", 9]);
		});

		await test("error handling", () => {
			const events: unknown[] = [];
			const signal = $(42);

			const computed = uncapture(() => memo(() => {
				if (signal.value === 77) {
					throw new Error("test");
				}
				return signal.value + 1;
			}));

			uncapture(() => {
				watch(computed, value => {
					events.push(value);
				});
			});
			assertEvents(events, [43]);
			strictEqual(computed(), 43);

			throws(() => {
				signal.value = 77;
			}, withMsg("test"));
			assertEvents(events, []);
			strictEqual(computed(), 43);

			signal.value = 123;
			assertEvents(events, [124]);
			strictEqual(computed(), 124);
		});
	});

	await suite("batch", async () => {
		await test("usage", () => {
			const events: unknown[] = [];
			const a = $(0);
			const b = $(1);
			uncapture(() => watch(() => {
				strictEqual(isTracking(), true);
				return a.value + b.value;
			}, value => {
				events.push(value);
			}));
			assertEvents(events, [1]);

			batch(() => {
				a.value++;
				b.value++;
				assertEvents(events, []);
			});
			assertEvents(events, [3]);

			batch(() => {
				a.value++;
				assertEvents(events, []);
				batch(() => {
					b.value++;
					assertEvents(events, []);
				});
				assertEvents(events, []);
			});
			assertEvents(events, [5]);

			batch(() => batch(() => {
				a.value++;
				b.value++;
				assertEvents(events, []);
				batch(() => {
					a.value++;
					b.value++;
					assertEvents(events, []);
				});
				assertEvents(events, []);
			}));
			assertEvents(events, [9]);

			batch(() => {
				a.value++;
				a.value++;
				assertEvents(events, []);
			});
			assertEvents(events, [11]);
		});

		await test("error handling", () => {
			const events: unknown[] = [];
			const signal = $(42);
			uncapture(() => watch(signal, value => {
				events.push(value);
			}));
			assertEvents(events, [42]);

			throws(() => {
				batch(() => {
					signal.value = 77;
					throw new Error("test");
				});
			}, withMsg("test"));

			strictEqual(signal.value, 77);
			assertEvents(events, []);

			signal.value = 2;
			strictEqual(signal.value, 2);
			assertEvents(events, [2]);

			batch(() => {
				throws(() => {
					batch(() => {
						signal.value = 11;
						throw new Error("test");
					});
				}, withMsg("test"));

				strictEqual(signal.value, 11);
				assertEvents(events, []);
			});
			assertEvents(events, [11]);

			signal.value = 3;
			strictEqual(signal.value, 3);
			assertEvents(events, [3]);
		});

		await test("disposed watch", () => {
			const events: unknown[] = [];
			const signal = $(42);
			const dispose = capture(() => watch(signal, value => {
				events.push("a", value);
			}));
			uncapture(() => watch(signal, value => {
				events.push("b", value);
			}));
			assertEvents(events, ["a", 42, "b", 42]);
			batch(() => {
				signal.value = 77;
				dispose();
			});
			assertEvents(events, ["b", 77]);
		});

		await test("disposed effect", () => {
			const events: unknown[] = [];
			const signal = $(42);
			const dispose = capture(() => effect(() => {
				events.push("a", signal.value);
			}));
			uncapture(() => effect(() => {
				events.push("b", signal.value);
			}));
			assertEvents(events, ["a", 42, "b", 42]);
			batch(() => {
				signal.value = 77;
				dispose();
			});
			assertEvents(events, ["b", 77]);
		});
	});

	await test("mapper", () => {
		strictEqual(map(42, String), "42");

		const a = map(() => 42, String);
		strictEqual(typeof a, "function");
		strictEqual((a as () => string)(), "42");

		const b = map($(42), String);
		strictEqual(typeof b, "function");
		strictEqual((b as () => string)(), "42");
	});

	await test("string", () => {
		strictEqual(get(string(42)), "42");
		strictEqual(get(string(null)), "null");
		strictEqual(get(string(undefined)), "undefined");
	});

	await test("optionalString", () => {
		strictEqual(get(optionalString(42)), "42");
		strictEqual(get(optionalString(null)), null);
		strictEqual(get(optionalString(undefined)), undefined);
	});

	await suite("trigger", async () => {
		await test("usage & lifecycle", () => {
			const events: unknown[] = [];
			const signalA = $(42);
			const signalB = $(1);

			let pipe!: TriggerPipe;
			const dispose = capture(() => {
				pipe = trigger(() => {
					events.push("trigger");
				});
			});

			strictEqual(signalA.active, false);
			strictEqual(pipe(() => {
				events.push("pipe");
				strictEqual(isTracking(), true);
				return signalA.value;
			}), 42);
			strictEqual(signalA.active, true);
			assertEvents(events, ["pipe"]);

			signalA.value = 13;
			assertEvents(events, ["trigger"]);
			strictEqual(signalA.active, false);

			signalA.value = 77;
			assertEvents(events, []);
			strictEqual(signalA.active, false);

			strictEqual(pipe(() => signalA.value), 77);
			strictEqual(signalA.active, true);

			strictEqual(pipe(() => signalB.value), 1);
			strictEqual(signalA.active, false);
			strictEqual(signalB.active, true);

			signalA.value = 123;
			assertEvents(events, []);
			signalB.value = 2;
			assertEvents(events, ["trigger"]);

			strictEqual(pipe(() => signalB.value), 2);
			strictEqual(signalB.active, true);

			dispose();
			strictEqual(signalB.active, false);

			signalB.value = 3;
			assertEvents(events, []);
			strictEqual(signalB.active, false);
		});

		await test("distinct update order, pre+post", () => {
			const events: unknown[] = [];
			const signal = $(1);
			uncapture(() => watch(signal, () => events.push("a")));
			const pipe = uncapture(() => trigger(() => events.push("t")));
			strictEqual(pipe(signal), 1);
			uncapture(() => watch(signal, () => events.push("b")));
			assertEvents(events, ["a", "b"]);
			signal.value = 2;
			assertEvents(events, ["a", "t", "b"]);
			signal.value = 3;
			assertEvents(events, ["a", "b"]);
		});

		await test("distinct update order, pre", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const pipe = uncapture(() => trigger(() => events.push("t")));
			strictEqual(pipe(signal), 1);
			uncapture(() => watch(signal, () => events.push("a")));
			uncapture(() => watch(signal, () => events.push("b")));
			assertEvents(events, ["a", "b"]);
			signal.value = 2;
			assertEvents(events, ["t", "a", "b"]);
			signal.value = 3;
			assertEvents(events, ["a", "b"]);
		});

		await test("distinct update order, post", () => {
			const events: unknown[] = [];
			const signal = $(1);
			uncapture(() => watch(signal, () => events.push("a")));
			uncapture(() => watch(signal, () => events.push("b")));
			const pipe = uncapture(() => trigger(() => events.push("t")));
			strictEqual(pipe(signal), 1);
			assertEvents(events, ["a", "b"]);
			signal.value = 2;
			assertEvents(events, ["a", "b", "t"]);
			signal.value = 3;
			assertEvents(events, ["a", "b"]);
		});

		await test("nested update order", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const pipeA = uncapture(() => trigger(() => events.push("a")));
			const pipeB = uncapture(() => trigger(() => events.push("b")));
			uncapture(() => watch(() => {
				return pipeA(() => {
					return pipeB(() => {
						return signal.value;
					});
				});
			}, value => {
				events.push("update", value);
			}));
			assertEvents(events, ["update", 1]);
			signal.value = 2;
			assertEvents(events, ["b", "a", "update", 2]);
			signal.value = 3;
			assertEvents(events, ["b", "a", "update", 3]);
		});

		await test("implicit update disposal", () => {
			const events: unknown[] = [];
			const signalA = $(1);
			const signalB = $(2);
			const pipe = uncapture(() => trigger(() => events.push("t")));
			strictEqual(pipe(() => signalA.value + signalB.value), 3);
			assertEvents(events, []);

			signalA.value = 3;
			assertEvents(events, ["t"]);
			signalB.value = 4;
			assertEvents(events, []);

			strictEqual(pipe(() => signalB.value + signalA.value), 7);
			signalA.value = 5;
			assertEvents(events, ["t"]);
			signalB.value = 6;
			assertEvents(events, []);
			signalA.value = 7;
			assertEvents(events, []);
		});

		await test("batch", () => {
			const events: unknown[] = [];
			const signalA = $(1);
			const signalB = $(2);
			const pipe = uncapture(() => trigger(() => events.push("t")));
			strictEqual(pipe(() => signalA.value + signalB.value), 3);
			assertEvents(events, []);

			batch(() => {
				signalA.value = 3;
				assertEvents(events, []);
			});
			assertEvents(events, ["t"]);
			signalB.value = 4;
			assertEvents(events, []);

			strictEqual(pipe(() => signalA.value + signalB.value), 7);
			batch(() => {
				signalA.value = 5;
				signalB.value = 6;
				assertEvents(events, []);
			});
			assertEvents(events, ["t"]);

			signalA.value = 7;
			signalB.value = 8;
			assertEvents(events, []);
		});

		await test("nested + batch", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const pipe = uncapture(() => trigger(() => events.push("t")));
			uncapture(() => watch(() => {
				return pipe(() => {
					return signal.value;
				});
			}, value => {
				events.push(value);
			}));
			assertEvents(events, [1]);
			batch(() => {
				signal.value = 2;
				assertEvents(events, []);
			});
			assertEvents(events, ["t", 2]);
			batch(() => {
				signal.value = 3;
				signal.value = 4;
				assertEvents(events, []);
			});
			assertEvents(events, ["t", 4]);
		});

		await test("external untrack", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const pipe = uncapture(() => trigger(() => events.push("trigger")));
			uncapture(() => {
				effect(() => {
					strictEqual(isTracking(), true);
					untrack(() => {
						strictEqual(isTracking(), false);
						pipe(() => {
							strictEqual(isTracking(), false);
							events.push("access");
							signal.access();
							strictEqual(isTracking(), false);
						});
						strictEqual(isTracking(), false);
					});
					strictEqual(isTracking(), true);
				});
			});
			assertEvents(events, ["access"]);
			signal.notify();
			assertEvents(events, []);
		});

		await test("internal untrack", () => {
			const events: unknown[] = [];
			const signal = $(1);
			const pipe = uncapture(() => trigger(() => events.push("trigger")));
			uncapture(() => {
				effect(() => {
					pipe(() => {
						strictEqual(isTracking(), true);
						untrack(() => {
							events.push("access");
							signal.access();
						});
						strictEqual(isTracking(), true);
					});
				});
			});
			assertEvents(events, ["access"]);
			signal.notify();
			assertEvents(events, []);
		});
	});
});
