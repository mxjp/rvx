import { deepStrictEqual } from "node:assert";
import test, { suite, TestContext } from "node:test";
import { $, capture, mapArray, teardown, uncapture, watch } from "rvx";
import { assertEvents } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		sequence.push(...sequence.toReversed().slice(1), ...sequence.slice(1));

		const events: unknown[] = [];
		const signal = $(sequence[0]);

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, (value, index, partialOutput) => {
				// TODO: Assert partial output state.
				events.push(`s${value}`);
				watch(index, index => {
					events.push(`i${value}:${index}`);
				});
				teardown(() => {
					events.push(`e${value}`);
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
					expectedEvents.push(`s${value}`, `i${value}:${i}`);
				} else {
					consumed[previousIndex] = true;
					if (i !== previousIndex) {
						expectedEvents.push(`i${value}:${i}`);
					}
				}
			}
			for (let i = 0; i < consumed.length; i++) {
				if (!consumed[i]) {
					expectedEvents.push(`e${previous[i]}`);
				}
			}

			expectedEvents.push("signal");
			assertEvents(events.sort(byRemoveEventOrder), expectedEvents.sort(byRemoveEventOrder));
			previous = current;
		}
	}

	function byRemoveEventOrder(a: unknown, b: unknown): number {
		if (typeof a === "string" && typeof b === "string" && a.startsWith("e") && b.startsWith("e")) {
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
});
