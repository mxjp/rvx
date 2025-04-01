import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { capture, nocapture, teardown, TeardownHook, uncapture } from "rvx";
import { onTeardownLeak } from "rvx/test";
import { TEARDOWN_STACK } from "../../dist/es/core/internals/teardown-stack.js";

await suite("test/lifecycle", async () => {
	await test("leak", () => {
		cleanTeardownStack(() => {
			const leaks: TeardownHook[] = [];
			onTeardownLeak(hook => {
				leaks.push(hook);
				throw new Error("test");
			});

			const hook = () => {};
			throws(() => {
				teardown(hook);
			}, error => {
				return error instanceof Error && error.message === "test";
			});

			deepStrictEqual(leaks, [hook]);
		});
	});

	await test("captures", () => {
		cleanTeardownStack(() => {
			const leaks: TeardownHook[] = [];
			onTeardownLeak(hook => {
				leaks.push(hook);
				throw new Error("invalid hook");
			});

			uncapture(() => {
				teardown(() => {});
			});

			capture(() => {
				teardown(() => {});
			});

			nocapture(() => {
				throws(() => {
					teardown(() => {});
				}, error => {
					return error instanceof Error && error.message === "G0";
				});
			});
		});
	});
});

function cleanTeardownStack(fn: () => void): void {
	strictEqual(TEARDOWN_STACK.length, 1);
	const originalStack = Array.from(TEARDOWN_STACK);
	TEARDOWN_STACK.length = 0;
	try {
		fn();
	} finally {
		TEARDOWN_STACK.length = 0;
		TEARDOWN_STACK.push(...originalStack);
	}
	strictEqual(TEARDOWN_STACK.length, 1);
}
