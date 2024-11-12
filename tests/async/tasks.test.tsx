import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { capture, Context, ENV, mount, uncapture, watch } from "rvx";
import { isPending, isSelfPending, TASKS, Tasks, waitFor } from "rvx/async";

import { assertEvents, future } from "../common.js";

await suite("async/tasks", async () => {
	for (const fn of [false, true]) {
		await test(`waitFor ${fn ? "function" : "promise"}`, async () => {
			const parent = uncapture(() => new Tasks());
			const inner = uncapture(() => new Tasks(parent));
			strictEqual(parent.pending, false);
			strictEqual(parent.selfPending, false);
			strictEqual(inner.pending, false);
			strictEqual(inner.selfPending, false);

			const [a, resolveA] = future();
			parent.waitFor(fn ? (() => a) : a);
			strictEqual(parent.pending, true);
			strictEqual(parent.selfPending, true);
			strictEqual(inner.pending, true);
			strictEqual(inner.selfPending, false);

			resolveA();
			await Promise.resolve();
			strictEqual(parent.pending, false);
			strictEqual(parent.selfPending, false);
			strictEqual(inner.pending, false);
			strictEqual(inner.selfPending, false);
		});
	}

	await test("setPending", async () => {
		const tasks = uncapture(() => new Tasks());
		strictEqual(tasks.pending, false);
		const dispose = capture(() => tasks.setPending());
		strictEqual(tasks.pending, true);
		dispose();
		strictEqual(tasks.pending, false);
	});

	await test("multiple tasks", async () => {
		const [a, resolveA] = future();
		const [b, resolveB] = future();
		const tasks = uncapture(() => new Tasks());
		tasks.waitFor(a);
		tasks.waitFor(b);
		strictEqual(tasks.pending, true);
		strictEqual(tasks.selfPending, true);
		resolveA();
		await Promise.resolve();
		strictEqual(tasks.pending, true);
		strictEqual(tasks.selfPending, true);
		resolveB();
		await Promise.resolve();
		strictEqual(tasks.pending, false);
		strictEqual(tasks.selfPending, false);
	});

	await test("error handling", async () => {
		const tasks = uncapture(() => new Tasks());
		const [a,, rejectA] = future();
		tasks.waitFor(a);
		strictEqual(tasks.pending, true);
		strictEqual(tasks.selfPending, true);
		rejectA(undefined);
		await Promise.resolve();
		strictEqual(tasks.pending, false);
		strictEqual(tasks.selfPending, false);
	});

	await test("tracking", async () => {
		const events: unknown[] = [];
		const tasks = uncapture(() => new Tasks());
		uncapture(() => {
			watch(() => tasks.pending, pending => {
				events.push(pending);
			});
			watch(() => tasks.selfPending, selfPending => {
				events.push(selfPending);
			});
		});
		assertEvents(events, [false, false]);

		const [a, resolveA] = future();
		tasks.waitFor(a);
		assertEvents(events, [true, true]);

		resolveA();
		await Promise.resolve();
		assertEvents(events, [false, false]);
	});

	await test("context api", async () => {
		strictEqual(isPending(), false);
		strictEqual(isSelfPending(), false);

		await TASKS.inject(uncapture(() => new Tasks()), () => {
			const outer = TASKS.current;
			strictEqual(outer instanceof Tasks, true);

			TASKS.inject(uncapture(() => new Tasks(outer)), () => {
				strictEqual(TASKS.current?.parent, outer);
			});

			const [a, resolveA] = future();
			waitFor(a);

			strictEqual(isPending(), true);
			strictEqual(isSelfPending(), true);

			return Promise.resolve()
				.then(Context.wrap(() => {
					strictEqual(isPending(), true);
					strictEqual(isSelfPending(), true);
				}))
				.then(resolveA)
				.then(Context.wrap(() => {
					strictEqual(isPending(), false);
					strictEqual(isSelfPending(), false);
				}));
		});
	});

	// TODO: Skip in rvx dom environment:
	await test("manage focus", async () => {
		const input = <input /> as HTMLInputElement;
		const dispose = capture(() => mount(ENV.current.document.body, input));
		try {
			const tasks = uncapture(() => new Tasks());

			input.focus();
			strictEqual(ENV.current.document.activeElement, input);

			const done = capture(() => tasks.setPending());

			input.blur();
			strictEqual(ENV.current.document.activeElement, ENV.current.document.body);

			done();
			strictEqual(ENV.current.document.activeElement, ENV.current.document.body);
			await Promise.resolve();
			strictEqual(ENV.current.document.activeElement, input);
		} finally {
			dispose();
		}
		strictEqual(ENV.current.document.activeElement, ENV.current.document.body);
	});
});
