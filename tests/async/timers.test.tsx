import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { capture, Context, teardown } from "rvx";
import { useAnimation, useInterval, useMicrotask, useTimeout } from "rvx/async";
import { poll } from "rvx/test";
import { assertEvents } from "../common.js";

await suite("async/timers", async () => {
	const CONTEXT = new Context<number>(42);

	await suite("useMicrotask", async () => {
		await test("regular usage", async () => {
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					useMicrotask(() => {
						teardown(() => {
							events.push("teardown", CONTEXT.current);
						});
						events.push("done", CONTEXT.current);
					});
				});
			});
			assertEvents(events, []);
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, ["done", 77]);
			dispose();
			assertEvents(events, ["teardown", 42]);
		});

		await test("immediate disposal", async () => {
			const events: unknown[] = [];
			capture(() => {
				useMicrotask(() => events.push("done"));
			})();
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, []);
		});

		await test("callback disposal", async () => {
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					useMicrotask(() => {
						teardown(() => {
							events.push("teardown", CONTEXT.current);
						});
						dispose();
						events.push("done", CONTEXT.current);
					});
				});
			});
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, ["done", 77, "teardown", 42]);
		});
	});

	await suite("useTimeout", async () => {
		await test("regular usage", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					useTimeout(() => {
						teardown(() => {
							events.push("teardown", CONTEXT.current);
						});
						events.push("done", CONTEXT.current);
					}, delay);
				});
			});
			assertEvents(events, []);
			await poll(() => events.includes("done"), 1000);
			assertEvents(events, ["done", 77]);
			dispose();
			assertEvents(events, ["teardown", 42]);
		});

		await test("immediate disposal", async () => {
			const delay = 10;
			const events: unknown[] = [];
			capture(() => {
				useTimeout(() => events.push("timeout"), delay);
			})();
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});

		await test("callback disposal", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					useTimeout(() => {
						teardown(() => {
							events.push("teardown", CONTEXT.current);
						});
						dispose();
						events.push("done", CONTEXT.current);
					}, delay);
				});
			});
			await poll(() => events.includes("done"), 1000);
			assertEvents(events, ["done", 77, "teardown", 42]);
		});
	});

	await suite("useInterval", async () => {
		await test("regular usage", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					let nextId = 0;
					useInterval(() => {
						const id = nextId++;
						teardown(() => {
							events.push(`e:${id}`, CONTEXT.current);
						});
						events.push(`s:${id}`, CONTEXT.current);
						if (id === 2) {
							queueMicrotask(dispose);
							events.push("dispose");
						}
					}, delay);
				});
			});
			await poll(() => events.includes("dispose"), 1000);
			assertEvents(events, ["s:0", 77, "e:0", 42, "s:1", 77, "e:1", 42, "s:2", 77, "dispose", "e:2", 42]);
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});

		await test("immediate disposal", async () => {
			const delay = 10;
			const events: unknown[] = [];
			capture(() => {
				useInterval(() => events.push("timeout"), delay);
			})();
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});

		await test("callback disposal", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					let nextId = 0;
					useInterval(() => {
						const id = nextId++;
						teardown(() => {
							events.push(`e:${id}`, CONTEXT.current);
						});
						events.push(`s:${id}`, CONTEXT.current);
						if (id === 2) {
							dispose();
							events.push("dispose");
						}
					}, delay);
				});
			});
			await poll(() => events.includes("dispose"), 1000);
			assertEvents(events, ["s:0", 77, "e:0", 42, "s:1", 77, "e:1", 42, "s:2", 77, "dispose", "e:2", 42]);
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});
	});

	await suite("useAnimation", async () => {
		await test("regular usage", async () => {
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					let nextId = 0;
					useAnimation(now => {
						strictEqual(typeof now, "number");
						const id = nextId++;
						teardown(() => {
							events.push(`e:${id}`, CONTEXT.current);
						});
						events.push(`s:${id}`, CONTEXT.current);
						if (id === 2) {
							queueMicrotask(dispose);
							events.push("dispose");
						}
					});
				});
			});
			try {
				await poll(() => events.includes("dispose"), 1000);
				assertEvents(events, ["s:0", 77, "e:0", 42, "s:1", 77, "e:1", 42, "s:2", 77, "dispose", "e:2", 42]);
			} finally {
				dispose();
			}
		});

		await test("immediate disposal", async () => {
			const events: unknown[] = [];
			capture(() => {
				useAnimation(() => {
					events.push("timeout");
					throw new Error("not disposed");
				});
			})();
			await new Promise<void>(r => setTimeout(r, 50));
			assertEvents(events, []);
		});

		await test("callback disposal", async () => {
			const events: unknown[] = [];
			const dispose = CONTEXT.inject(77, () => {
				return capture(() => {
					let nextId = 0;
					useAnimation(now => {
						const id = nextId++;
						teardown(() => {
							events.push(`e:${id}`, CONTEXT.current);
						});
						events.push(`s:${id}`, CONTEXT.current);
						if (id === 2) {
							dispose();
							events.push("dispose");
						}
					});
				});
			});
			try {
				await poll(() => events.includes("dispose"), 1000);
				assertEvents(events, ["s:0", 77, "e:0", 42, "s:1", 77, "e:1", 42, "s:2", 77, "dispose", "e:2", 42]);
			} finally {
				dispose();
			}
		});
	});
});
