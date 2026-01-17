import { deepStrictEqual, throws } from "node:assert";
import test, { suite, TestContext } from "node:test";
import { $, capture, mapArray, teardown, uncapture, watch } from "rvx";
import { assertEvents, computeMapArrayEvents, trimMapArrayErrors, unorderedRemoveEvents, withMsg } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		sequence.push(...sequence.toReversed().slice(1), ...sequence.slice(1));

		const events: unknown[] = [];
		const signal = $(sequence[0]);

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, (value, index, partialOutput) => {
				if (value === 0) {
					throw new Error("test");
				}
				events.push(`+${value}`);
				watch(index, index => {
					events.push(`i${value}:${index}`);
					deepStrictEqual(signal.value.slice(0, index).map(v => -v), partialOutput.slice(0, index));
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
			const errorIndex = current.indexOf(0);
			if (s > 0) {
				if (errorIndex < 0) {
					signal.value = current;
				} else {
					throws(() => signal.value = current, withMsg("test"));
				}
			}
			deepStrictEqual(output(), trimMapArrayErrors(current).map(v => -v));
			const expectedEvents = computeMapArrayEvents(previous, current, true);
			if (errorIndex < 0) {
				expectedEvents.push("signal");
			}
			assertEvents(events.sort(unorderedRemoveEvents), expectedEvents.sort(unorderedRemoveEvents));
			previous = current;
		}

		dispose();
		deepStrictEqual(output(), trimMapArrayErrors(previous).map(v => -v));
		assertEvents(events.sort(unorderedRemoveEvents), trimMapArrayErrors(previous).map(value => `-${value}`).sort(unorderedRemoveEvents));
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

	await test("error recovery", () => {
		sequenceTest([
			[1, 2, 3, 4, 5],
			[2, 4, 0],
			[1, 4, 3, 2, 5],
			[],
			[1, 2, 3, 4, 5, 0],
			[5, 3, 0, 1],
			[2, 4],
			[1, 2, 3, 0, 4, 5, 6, 7],
			[2, 9, 10, 7, 8, 1, 5, 0],
			[2, 2, 1, 1, 5, 5, 0],
			[2, 1, 5, 3, 2, 1, 3, 5, 2, 5, 1, 0],
			[3, 5, 1, 2],
			[1, 1, 3, 2, 2, 5, 2, 5, 1, 2, 0],
			[1, 2, 1, 5, 3, 2, 2, 1, 2, 5, 0],
			[1, 2, 2, 5, 2, 0],
			[2, 5, 3, 2, 2, 0],
			[2, 5, 2, 5, 3, 2, 2, 0],
			[2, 5, 2, 5, 3, 2, 2, 5, 3],
			[2, 5, 1, 3, 2, 2, 0],
			[2, 5, 1, 2, 5, 3, 2, 2, 0],
			[2, 5, 1, 2, 5, 3, 2, 2, 5, 3, 0],
			[1, 2, 3, 4, 5, 6, 7, 0],
			[1, 2, 3, 4, 5, 6, 7],
			[2, 9, 10, 7, 8, 1, 5, 0],
			[2, 9, 10, 7, 8, 1, 5, 0],
			[2, 2, 1, 1, 5, 5, 0],
			[2, 2, 1, 1, 5, 5, 0],
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
						values.push(1 + Math.floor(Math.random() * maxRange));
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
				assertEvents(events.sort(unorderedRemoveEvents), context === capture
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
				assertEvents(events.sort(unorderedRemoveEvents), context === capture
					? ["+1", "+2", "error", "-1", "-2"]
					: ["+1", "+2", "error", "-2"]);
			};
		}
		await test("capture", errorHandlingTest(capture));
		await test("uncapture", errorHandlingTest(uncapture));
	});

	await test("sequential side effect", () => {
		const events: unknown[] = [];
		const signal = $([1]);
		const output = uncapture(() => {
			return mapArray(signal, value => {
				if (value === 3) {
					signal.value = [5];
				}
				events.push(`+${value}`);
				teardown(() => {
					events.push(`-${value}`);
				});
				return -value;
			});
		});
		deepStrictEqual(output(), [-1]);
		assertEvents(events, ["+1"]);
		signal.value = [2, 3, 4];
		deepStrictEqual(signal.value, [5]);
		deepStrictEqual(output(), [-5]);
		assertEvents(events, ["+2", "+3", "+4", "-1", "+5", "-2", "-3", "-4"].sort(unorderedRemoveEvents));
	});

	await test("iterator internal updates & lifecycle", () => {
		const events: unknown[] = [];
		const signal = $(2);
		const output = uncapture(() => {
			return mapArray(function * () {
				yield 1;
				yield signal.value;
				events.push("start");
				teardown(() => {
					events.push("end");
				});
				yield 3;
			}, value => {
				events.push(`+${value}`);
				teardown(() => {
					events.push(`-${value}`);
				});
				return -value;
			});
		});
		deepStrictEqual(output(), [-1, -2, -3]);
		assertEvents(events, ["+1", "+2", "start", "+3"]);
		signal.value = 4;
		deepStrictEqual(output(), [-1, -4, -3]);
		assertEvents(events, ["end", "+4", "start", "-2"]);
	});

	await test("callback isolation", () => {
		const expr = $([1]);
		const isolated = $("a");
		const output = uncapture(() => {
			return mapArray(expr, value => {
				return isolated.value + value;
			});
		});
		deepStrictEqual(output(), ["a1"]);
		isolated.value = "b";
		deepStrictEqual(output(), ["a1"]);
		// input value identity is the same:
		expr.notify();
		deepStrictEqual(output(), ["a1"]);
		expr.value = [2];
		deepStrictEqual(output(), ["b2"]);
	});
});
