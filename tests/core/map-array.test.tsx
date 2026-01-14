import { deepStrictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, capture, mapArray, teardown, watch } from "rvx";
import { assertEvents } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		sequence.push(...sequence.toReversed(), ...sequence);

		const updates: unknown[] = [];
		const removals: unknown[] = [];
		const signal = $(sequence[0]);

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, (value, index, partialOutput) => {
				// TODO: Assert partial output state.

				updates.push(`s${value}`);

				watch(index, index => {
					updates.push(`${value}:${index}`);
				});

				teardown(() => {
					removals.push(`e${value}`);
				});

				return -value;
			});
		});

		let previous: number[] = [];
		for (let s = 0; s < sequence.length; s++) {
			const current = sequence[s];
			signal.value = current;

			deepStrictEqual(output(), current.map(v => -v));

			const expectedUpdates: unknown[] = [];
			const consumed = previous.map(() => false);
			for (let i = 0; i < current.length; i++) {
				const value = current[i];
				const previousIndex = previous.findIndex((v, i) => (v === value && !consumed[i]));
				if (previousIndex < 0) {
					expectedUpdates.push(`s${value}`, `${value}:${i}`);
				} else {
					consumed[previousIndex] = true;
					if (i !== previousIndex) {
						expectedUpdates.push(`${value}:${i}`);
					}
				}
			}
			const expectedRemovals: unknown[] = [];
			for (let i = 0; i < consumed.length; i++) {
				if (!consumed[i]) {
					expectedRemovals.push(`e${previous[i]}`);
				}
			}

			assertEvents(updates, expectedUpdates);
			assertEvents(removals.sort(), expectedRemovals.sort());

			updates.length = 0;
			previous = current;
		}
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
		]);
	});
});
