import { isolate } from "./isolate.js";
import { capture, teardown, TeardownHook } from "./lifecycle.js";
import { $, Expression, get, Signal, watch } from "./signals.js";

export type MapArrayFn<I, O> = (input: I, index: () => number) => O;

export function mapArray<I, O>(inputs: Expression<Iterable<I>>, fn: MapArrayFn<I, O>) {
	interface Instance {
		input: I;
		output: O;
		index: Signal<number>,
		dispose: TeardownHook,
	}

	const state: Instance[] = [];
	const output = $<O[]>([]);

	teardown(() => {
		for (let i = 0; i < state.length; i++) {
			state[i].dispose();
		}
	});

	watch(() => {
		const raw = get(inputs);
		return Array.isArray(raw) ? raw as I[] : Array.from(raw);
	}, inputs => {
		let start = 0;
		const maxStart = Math.min(state.length, inputs.length);
		while (start < maxStart && Object.is(inputs[start], state[start].input)) {
			start++;
		}

		if (start === inputs.length && inputs.length === state.length) {
			return;
		}

		const minEnd = inputs.length - maxStart + start;
		const lenDiff = inputs.length - state.length;

		let end = inputs.length - 1;
		while (end >= minEnd && Object.is(inputs[end], state[end - lenDiff].input)) {
			end--;
		}
		end++;
		const stateEnd = end - lenDiff;

		if ((end - lenDiff - start) === 0) {
			// TODO: Insert only fast path.
		}

		const indexByValue = new Map<I, number>();
		const nextIndexByIndex: number[] = [];
		for (let i = end - 1; i >= start; i--) {
			const value = inputs[i];
			const next = indexByValue.get(value);
			if (next !== undefined) {
				nextIndexByIndex[i] = next;
			}
			indexByValue.set(value, i);
		}

		const nextState: Instance[] = [];

		for (let i = start; i < stateEnd; i++) {
			const instance = state[i];
			const index = indexByValue.get(instance.input);
			if (index === undefined) {
				instance.dispose();
			} else {
				nextState[index - start] = instance;
				indexByValue.set(instance.input, nextIndexByIndex[index]);
			}
		}

		for (let i = start; i < end; i++) {
			const old = nextState[i - start];
			if (old) {
				old.index.value = i;
			} else {
				const value = inputs[i];

				const index = $(i);
				let output!: O;
				const dispose = isolate(capture, () => {
					output = fn(value, () => index.value);
				});

				nextState[i - start] = {
					input: value,
					output,
					index,
					dispose,
				};
			}
		}

		state.splice(start, stateEnd - start, ...nextState);

		for (let i = end; i < state.length; i++) {
			state[i].index.value = i;
		}

		output.value.splice(start, stateEnd - start, ...nextState.map(s => s.output));
		output.notify();
	});

	return () => output.value;
}
