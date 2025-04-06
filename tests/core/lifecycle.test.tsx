import { fail, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { capture, captureSelf, created, nocapture, teardown, TeardownHook, teardownOnError, uncapture } from "rvx";
import { assertEvents, withMsg } from "../common.js";

await suite("lifecycle", async () => {
	await test("inert use", () => {
		uncapture(() => {
			teardown(() => {
				throw new Error("this should not happen");
			});
		});
	});

	await test("capture", () => {
		const events: unknown[] = [];
		events.push(0);
		let inner!: TeardownHook;
		const outer = capture(() => {
			events.push(1);

			teardown(() => {
				events.push(2);
			});

			uncapture(() => {
				events.push(3);

				teardown(() => {
					events.push(4);
				});
			});

			inner = capture(() => {
				events.push(5);

				teardown(() => {
					events.push(6);
				});
			});
		});

		assertEvents(events, [0, 1, 3, 5]);
		outer();
		assertEvents(events, [2]);
		inner();
		assertEvents(events, [6]);
	});

	await suite("capture self", async () => {
		await test("defer immediate", () => {
			const events: unknown[] = [];
			events.push(0);
			const value = captureSelf(dispose => {
				events.push(1);
				dispose();
				events.push(2);
				teardown(() => {
					events.push(3);
				});
				events.push(4);
				return 42;
			});
			strictEqual(value, 42);
			events.push(5);
			assertEvents(events, [0, 1, 2, 4, 3, 5]);
		});

		await test("delayed", () => {
			const events: unknown[] = [];
			events.push(0);
			const dispose = captureSelf(dispose => {
				events.push(1);
				teardown(() => {
					events.push(2);
				});
				events.push(3);
				return dispose;
			});
			events.push(4);
			dispose();
			events.push(5);
			assertEvents(events, [0, 1, 3, 4, 2, 5]);
		});
	});

	await suite("teardownOnError", async () => {
		await test("no error", () => {
			const events: unknown[] = [];
			const dispose = capture(() => {
				teardown(() => events.push(0));
				teardownOnError(() => {
					teardown(() => events.push(1));
					teardown(() => events.push(2));
				});
				teardown(() => events.push(3));
				assertEvents(events, []);
			});
			assertEvents(events, []);
			dispose();
			assertEvents(events, [3, 2, 1, 0]);
		});

		await test("error", () => {
			const events: unknown[] = [];
			const dispose = capture(() => {
				try {
					teardown(() => events.push(0));
					teardownOnError(() => {
						events.push("test");
						teardown(() => events.push(1));
						teardown(() => events.push(2));
						throw new Error("error");
					});
					fail("unreachable");
				} catch (error) {
					assertEvents(events, ["test", 2, 1]);
					events.push((error as Error).message);
				}
			});
			assertEvents(events, ["error"]);
			dispose();
			assertEvents(events, [0]);
		});
	});

	await suite("error handling", async () => {
		await test("capture", () => {
			const events: unknown[] = [];
			const outer = capture(() => {
				teardown(() => {
					events.push(0);
				});
				throws(() => {
					capture(() => {
						teardown(() => {
							events.push(2);
						});
						throw new Error("test");
					});
				}, withMsg("test"));
				assertEvents(events, [2]);
				teardown(() => {
					events.push(1);
				});
			});
			outer();
			assertEvents(events, [1, 0]);
		});

		for (const disposeInner of [false, true]) {
			await test(`captureSelf (immediate${disposeInner ? ", dispose inner" : ""})`, () => {
				const events: unknown[] = [];
				captureSelf(outer => {
					outer();
					teardown(() => {
						events.push(0);
					});
					throws(() => {
						captureSelf(inner => {
							if (disposeInner) {
								inner();
							}
							teardown(() => {
								events.push(2);
							});
							throw new Error("test");
						});
					}, withMsg("test"));
					assertEvents(events, [2]);
					teardown(() => {
						events.push(1);
					});
					assertEvents(events, []);
				});
				assertEvents(events, [1, 0]);
			});

			await test(`captureSelf (delayed${disposeInner ? ", dispose inner" : ""})`, () => {
				const events: unknown[] = [];
				let outerDispose!: TeardownHook;
				captureSelf(outer => {
					outerDispose = outer;
					teardown(() => {
						events.push(0);
					});
					let innerDispose!: TeardownHook;
					throws(() => {
						captureSelf(inner => {
							innerDispose = inner;
							teardown(() => {
								events.push(2);
							});
							throw new Error("test");
						});
					}, withMsg("test"));
					assertEvents(events, [2]);
					if (disposeInner) {
						innerDispose();
					}
					teardown(() => {
						events.push(1);
					});
				});
				assertEvents(events, []);
				outerDispose();
				assertEvents(events, [1, 0]);
			});
		}

		await test("capture, teardown error", () => {
			const events: unknown[] = [];
			const dispose = capture(() => {
				teardown(() => {
					events.push(0);
				});
				teardown(() => {
					throw new Error("test");
				});
				teardown(() => {
					events.push(1);
				});
			});
			throws(dispose, withMsg("test"));
			assertEvents(events, [1]);
		});

		await test("captureSelf, immediate, teardown error", () => {
			const events: unknown[] = [];
			throws(() => {
				captureSelf(dispose => {
					dispose();
					teardown(() => {
						events.push(0);
					});
					teardown(() => {
						throw new Error("test");
					});
					teardown(() => {
						events.push(1);
					});
					teardown(() => {
						events.push(2);
					});
					events.push(3);
				});
			}, withMsg("test"));
			assertEvents(events, [3, 2, 1]);
		});

		await test("captureSelf, deferred, teardown hook error", () => {
			const events: unknown[] = [];
			let disposeFn!: TeardownHook;
			captureSelf(dispose => {
				disposeFn = dispose;
				teardown(() => {
					events.push(0);
				});
				teardown(() => {
					throw new Error("test");
				});
				teardown(() => {
					events.push(1);
				});
				teardown(() => {
					events.push(2);
				});
				events.push(3);
			});
			assertEvents(events, [3]);
			throws(disposeFn, withMsg("test"));
			assertEvents(events, [2, 1]);
		});

		await test("capture + teardown error", () => {
			throws(() => {
				capture(() => {
					teardown(() => {
						throw new Error("a");
					});
					throw new Error("b");
				});
			}, withMsg("a"));
		});

		await test("captureSelf (non disposed) + teardown error", () => {
			throws(() => {
				captureSelf(() => {
					teardown(() => {
						throw new Error("a");
					});
					throw new Error("b");
				});
			}, withMsg("a"));
		});

		await test("captureSelf (disposed) + teardown error", () => {
			throws(() => {
				captureSelf(dispose => {
					dispose();
					teardown(() => {
						throw new Error("a");
					});
					throw new Error("b");
				});
			}, withMsg("a"));
		});
	});
});
