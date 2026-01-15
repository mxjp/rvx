import { deepStrictEqual, throws } from "node:assert";
import test, { suite, TestContext } from "node:test";
import { $, capture, mapArray, teardown, uncapture, watch } from "rvx";
import { assertEvents, withMsg } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		sequence.push(...sequence.toReversed().slice(1), ...sequence.slice(1));

		const events: unknown[] = [];
		const signal = $(sequence[0]);

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, (value, index, partialOutput) => {
				// TODO: Assert partial output state.
				events.push(`+${value}`);
				watch(index, index => {
					events.push(`i${value}:${index}`);
				});
				teardown(() => {
					events.push(`-${value}`);
				});
				return -value;
			});
		});

		uncapture(() => {
			watch(output, () => {
				events.push("signal");
			})
		});

		let previous: number[] = [];
		for (let s = 0; s < sequence.length; s++) {
			const current = sequence[s];
			if (s > 0) {
				signal.value = current;
			}

			deepStrictEqual(output(), current.map(v => -v));

			const expectedEvents: unknown[] = [];
			const consumed = previous.map(() => false);
			for (let i = 0; i < current.length; i++) {
				const value = current[i];
				const previousIndex = previous.findIndex((v, i) => (v === value && !consumed[i]));
				if (previousIndex < 0) {
					expectedEvents.push(`+${value}`, `i${value}:${i}`);
				} else {
					consumed[previousIndex] = true;
					if (i !== previousIndex) {
						expectedEvents.push(`i${value}:${i}`);
					}
				}
			}
			for (let i = 0; i < consumed.length; i++) {
				if (!consumed[i]) {
					expectedEvents.push(`-${previous[i]}`);
				}
			}

			expectedEvents.push("signal");
			assertEvents(events.sort(byRemoveEventOrder), expectedEvents.sort(byRemoveEventOrder));
			previous = current;
		}
	}

	function byRemoveEventOrder(a: unknown, b: unknown): number {
		if (typeof a === "string" && typeof b === "string" && a.startsWith("-") && b.startsWith("-")) {
			return a > b ? 1 : (a < b ? -1 : 0);
		}
		return 0;
	}

	await test("fixed sequence", () => {
		sequenceTest([
			[1, 2, 3, 4, 5],
			[2, 4],
			[1, 4, 3, 2, 5],
			[],
			[1, 2, 3, 4, 5],
			[5, 3, 1],
			[2, 4],
			[1, 2, 3, 4, 5, 6, 7],
			[2, 9, 10, 7, 8, 1, 5],
			[2, 2, 1, 1, 5, 5],
			[2, 1, 5, 3, 2, 1, 3, 5, 2, 5, 1],
			[3, 5, 1, 2],
			[1, 1, 3, 2, 2, 5, 2, 5, 1, 2],
			[1, 2, 1, 5, 3, 2, 2, 1, 2, 5],
			[1, 2, 2, 5, 2],
			[2, 5, 3, 2, 2],
			[2, 5, 2, 5, 3, 2, 2],
			[2, 5, 2, 5, 3, 2, 2, 5, 3],
			[2, 5, 1, 3, 2, 2],
			[2, 5, 1, 2, 5, 3, 2, 2],
			[2, 5, 1, 2, 5, 3, 2, 2, 5, 3],
			[1, 2, 3, 4, 5, 6, 7],
			[1, 2, 3, 4, 5, 6, 7],
			[2, 9, 10, 7, 8, 1, 5],
			[2, 9, 10, 7, 8, 1, 5],
			[2, 2, 1, 1, 5, 5],
			[2, 2, 1, 1, 5, 5],
		]);
	});

	await suite("random sequences", async () => {
		function randomSequenceTest(size: number, maxCount: number, maxRange: number) {
			return (ctx: TestContext) => {
				const sequence: number[][] = [];
				for (let s = 0; s < size; s++) {
					const count = Math.floor(Math.random() * maxCount);
					const values: number[] = [];
					for (let i = 0; i < count; i++) {
						values.push(Math.floor(Math.random() * maxRange));
					}
					sequence.push(values);
				}
				try {
					sequenceTest(sequence);
				} catch (error) {
					ctx.diagnostic(`Broken sequence: ${JSON.stringify(sequence)}`);
					throw error;
				}
			};
		}

		await test(randomSequenceTest(100, 20, 10));
		await test(randomSequenceTest(100, 20, 3));
		await test(randomSequenceTest(100, 20, 100));
	});

	await suite("initial iteration error handling", async () => {
		function errorHandlingTest(context: typeof capture | typeof uncapture) {
			return () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						mapArray(function * () {
							yield 1;
							yield 2;
							events.push("error");
							throw new Error("test");
						}, value => {
							events.push(`+${value}`);
							teardown(() => {
								events.push(`-${value}`);
							});
							return -value;
						});
					});
				}, withMsg("test"));
				assertEvents(events.sort(byRemoveEventOrder), context === capture
					? ["+1", "+2", "error", "-1", "-2"]
					: ["+1", "+2", "error"]);
			};
		}
		await test("capture", errorHandlingTest(capture));
		await test("uncapture", errorHandlingTest(uncapture));
	});

	await suite("initial map error handling", async () => {
		function errorHandlingTest(context: typeof capture | typeof uncapture) {
			return () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						mapArray([1, 2, 3], value => {
							events.push(`+${value}`);
							teardown(() => {
								events.push(`-${value}`);
							});
							if (value === 2) {
								events.push("error");
								throw new Error("test");
							}
							return -value;
						});
					});
				}, withMsg("test"));
				assertEvents(events.sort(byRemoveEventOrder), context === capture
					? ["+1", "+2", "error", "-1", "-2"]
					: ["+1", "+2", "error", "-2"]);
			};
		}
		await test("capture", errorHandlingTest(capture));
		await test("uncapture", errorHandlingTest(uncapture));
	});

	// TODO: Sequential side effects.
	// TODO: Iterator internal updates.
	// TODO: Iterator lifecycle.
	// TODO: Callback access isolation.
});
