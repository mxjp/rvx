import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, capture, mapArray, memo, teardown, uncapture, watch } from "rvx";
import { assertEvents, computeMapArrayDiffEvents, lifecycleEvent } from "../common.js";

await suite("mapArray", async () => {
	function sequenceTest(sequence: number[][]) {
		const events: unknown[] = [];
		const signal = $(sequence[0]);
		const outputByIndex: (number | undefined)[] = [];
		const identityByIndex: symbol[] = [];

		let output!: () => number[];
		const dispose = capture(() => {
			output = mapArray(signal, (value, index) => {
				const identity = Symbol();
				events.push(`+${value}`);
				teardown(() => {
					events.push(`-${value}`);
				});
				watch(index, index => {
					outputByIndex[index] = -value;
					identityByIndex[index] = identity;
				});
				return -value;
			});
		});

		const watchedOutput = uncapture(() => memo(output));

		function assertIndexes() {
			deepStrictEqual(outputByIndex.slice(0, output().length), output());
			strictEqual(new Set(identityByIndex.slice(0, output().length)).size, output().length);
		}

		assertEvents(events, computeMapArrayDiffEvents([], sequence[0]));
		deepStrictEqual(output(), sequence[0].map(v => -v));
		deepStrictEqual(watchedOutput(), sequence[0].map(v => -v));
		assertIndexes();

		for (let i = 1; i < sequence.length; i++) {
			signal.value = sequence[i];
			assertEvents(events, computeMapArrayDiffEvents(sequence[i - 1], sequence[i]));
			deepStrictEqual(output(), sequence[i].map(v => -v));
			deepStrictEqual(watchedOutput(), sequence[i].map(v => -v));
			assertIndexes();
		}

		dispose();
		assertEvents(events, computeMapArrayDiffEvents(sequence[sequence.length - 1], []));
		deepStrictEqual(output(), sequence[sequence.length - 1].map(v => -v));
		deepStrictEqual(watchedOutput(), sequence[sequence.length - 1].map(v => -v));
		assertIndexes();
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

	await test("sequential map side effects", () => {
		const events: unknown[] = [];
		const signal = $([1]);
		const output = uncapture(() => mapArray(signal, value => {
			if (value === 3) {
				signal.value = [5];
			}
			lifecycleEvent(events, String(value));
			return value;
		}));
		assertEvents(events, ["s:1"]);
		deepStrictEqual(output(), [1]);
		signal.value = [2, 3, 4];
		assertEvents(events, ["e:1", "s:2", "s:3", "s:4", "e:2", "e:3", "e:4", "s:5"]);
		deepStrictEqual(output(), [5]);
	});

	await test("sequential index side effects", () => {
		const events: unknown[] = [];
		const signal = $([1, 2]);
		const output = uncapture(() => mapArray(signal, (value, index) => {
			if (index() === 0) {
				watch(index, index => {
					if (index === 2) {
						signal.value = [4];
					}
				});
			}
			lifecycleEvent(events, String(value));
			return value;
		}));
		assertEvents(events, ["s:1", "s:2"]);
		deepStrictEqual(output(), [1, 2]);
		signal.value = [3, 2, 1];
		assertEvents(events, ["s:3", "e:3", "e:2", "e:1", "s:4"]);
		deepStrictEqual(output(), [4]);
	});

	await test("map isolation", () => {
		const signal = $(0);
		const output = uncapture(() => mapArray([1], value => {
			return value + signal.value;
		}));
		deepStrictEqual(output(), [1]);
		signal.value = 2;
		deepStrictEqual(output(), [1]);
	});
});
