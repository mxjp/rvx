import { deepStrictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, capture, mapArray, teardown } from "rvx";
import { assertEvents } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		const events: unknown[] = [];
		const signal = $(sequence[0]);

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, v => {
				events.push(`+${v}`);
				teardown(() => {
					events.push(`-${v}`);
				});

				return -v;
			});
		});

		assertEvents(events, computeDiffEvents([], sequence[0]));

		for (let i = 1; i < sequence.length; i++) {
			signal.value = sequence[i];
			assertEvents(events, computeDiffEvents(sequence[i - 1], sequence[i]));
		}
	}

	function computeDiffEvents(prev: number[], next: number[]) {
		function computeRaw(prev: number[], next: number[]) {
			const events: unknown[] = [];
			const consumed = prev.map(() => false);
			for (const value of next) {
				const prevIndex = prev.findIndex((v, i) => v === value && !consumed[i]);
				if (prevIndex < 0) {
					events.push(`+${value}`);
				} else {
					consumed[prevIndex] = true;
				}
			}
			for (let i = prev.length - 1; i >= 0; i--) {
				if (!consumed[i]) {
					events.unshift(`-${prev[i]}`);
				}
			}
			return events;
		}

		prev = Array.from(prev);
		next = Array.from(next);
		const allEvents = computeRaw(prev, next);
		while (prev.length > 0 && next.length > 0 && prev[0] === next[0]) {
			prev.shift();
			next.shift();
		}
		while (prev.length > 0 && next.length > 0 && prev[prev.length - 1] === next[next.length - 1]) {
			prev.pop();
			next.pop();
		}
		const trimmedEvents = computeRaw(prev, next);
		deepStrictEqual(allEvents.toSorted(), trimmedEvents.toSorted());
		return trimmedEvents;
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
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[1, 5, 6, 7, 8, 2, 3, 4, 9],
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[1, 6, 7, 8, 2, 3, 4, 5, 9],
		]);
	});

	await suite("random sequences", async () => {
		function randomSequenceTest(count: number, maxLength: number, maxValue: number) {
			return () => {
				const sequence: number[][] = [];
				for (let i = 0; i < count; i++) {
					const values: number[] = [];
					const length = Math.floor(Math.random() * maxLength);
					for (let v = 0; v < length; v++) {
						values.push(1 + Math.floor(Math.random() * maxValue));
					}
					sequence.push(values);
				}
				sequenceTest(sequence);
			};
		}

		await test(randomSequenceTest(1024, 24, 8));
		await test(randomSequenceTest(1024, 8, 24));
		await test(randomSequenceTest(1024, 24, 24));
	});
});
