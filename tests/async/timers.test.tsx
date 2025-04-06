import test, { suite } from "node:test";
import { capture, nocapture, teardown } from "rvx";
import { useInterval, useMicrotask, useTimeout } from "rvx/async";
import { poll } from "rvx/test";
import { assertEvents, withMsg } from "../common.js";
import { throws } from "node:assert";

await suite("async/timers", async () => {
	await suite("useMicrotask", async () => {
		await test("regular usage", async () => {
			const events: unknown[] = [];
			const dispose = capture(() => {
				useMicrotask(() => {
					teardown(() => {
						events.push("teardown");
					});
					events.push("done");
				});
			});
			assertEvents(events, []);
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, ["done"]);
			dispose();
			assertEvents(events, ["teardown"]);
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
			const dispose = capture(() => {
				useMicrotask(() => {
					teardown(() => {
						events.push("teardown");
					});
					dispose();
					events.push("done");
				});
			});
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, ["done", "teardown"]);
		});

		await test("nocapture context", async () => {
			const events: unknown[] = [];
			nocapture(() => {
				throws(() => {
					useMicrotask(() => events.push("done"));
				}, withMsg("G0"));
			});
			await new Promise<void>(r => queueMicrotask(r));
			assertEvents(events, []);
		});
	});

	await suite("useTimeout", async () => {
		await test("regular usage", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = capture(() => {
				useTimeout(() => {
					teardown(() => {
						events.push("teardown");
					});
					events.push("done");
				}, delay);
			});
			assertEvents(events, []);
			await poll(() => events.includes("done"), delay * 2);
			assertEvents(events, ["done"]);
			dispose();
			assertEvents(events, ["teardown"]);
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
			const dispose = capture(() => {
				useTimeout(() => {
					teardown(() => {
						events.push("teardown");
					});
					dispose();
					events.push("done");
				}, delay);
			});
			await poll(() => events.includes("done"), delay * 2);
			assertEvents(events, ["done", "teardown"]);
		});

		await test("nocapture context", async () => {
			const delay = 10;
			const events: unknown[] = [];
			nocapture(() => {
				throws(() => {
					useTimeout(() => events.push("done"), delay);
				}, withMsg("G0"));
			});
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});
	});

	await suite("useInterval", async () => {
		await test("regular usage", async () => {
			const delay = 10;
			const events: unknown[] = [];
			const dispose = capture(() => {
				let nextId = 0;
				useInterval(() => {
					const id = nextId++;
					teardown(() => {
						events.push(`e:${id}`);
					});
					events.push(`s:${id}`);
					if (id === 2) {
						queueMicrotask(dispose);
						events.push("dispose");
					}
				}, delay);
			});
			await poll(() => events.includes("dispose"), delay * 4);
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "dispose", "e:2"]);
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
			const dispose = capture(() => {
				let nextId = 0;
				useInterval(() => {
					const id = nextId++;
					teardown(() => {
						events.push(`e:${id}`);
					});
					events.push(`s:${id}`);
					if (id === 2) {
						dispose();
						events.push("dispose");
					}
				}, delay);
			});
			await poll(() => events.includes("dispose"), delay * 4);
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "dispose", "e:2"]);
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});

		await test("nocapture context", async () => {
			const delay = 10;
			const events: unknown[] = [];
			nocapture(() => {
				throws(() => {
					useInterval(() => events.push("done"), delay);
				}, withMsg("G0"));
			});
			await new Promise<void>(r => setTimeout(r, delay * 2));
			assertEvents(events, []);
		});
	});
});
