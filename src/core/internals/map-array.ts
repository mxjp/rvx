import { isolate } from "../isolate.js";
import { capture, teardown, TeardownHook } from "../lifecycle.js";
import { REACTIVE_ARRAY } from "../markers.js";
import { $, Expression, get, Signal } from "../signals.js";

export type MapArrayFn<I, O> = (input: I, index: () => number) => O;

export interface MapArrayStateEntry<I, O> {
	/** input */
	i: I;
	/** output */
	o: O;
	/** signal */
	s: Signal<number>,
	/** dispose */
	d: TeardownHook,
	/** removed */
	r: boolean,
}

export interface MapArrayUpdate<I, O> {
	/** inclusive start index in new state */
	s: number;
	/** exclusive end index in new state */
	e: number;
	/** previous chunk */
	p: MapArrayStateEntry<I, O>[];
	/** next chunk */
	n: MapArrayStateEntry<I, O>[];
}

export function mapArrayInput<T>(input: Expression<Iterable<T>>): () => T[] {
	return () => {
		const raw = get(input);
		if (Array.isArray(raw) && !(raw as any)[REACTIVE_ARRAY]) {
			return raw;
		}
		return Array.from(raw);
	};
}

export function createMapArrayState<I, O>() {
	const state: MapArrayStateEntry<I, O>[] = [];
	teardown(() => {
		for (let i = 0; i < state.length; i++) {
			state[i].d();
		}
	});
	return state;
}

export function mapArrayUpdate<I, O>(state: MapArrayStateEntry<I, O>[], inputs: I[], fn: MapArrayFn<I, O>): MapArrayUpdate<I, O> | null {
	let start = 0;
	const maxStart = Math.min(state.length, inputs.length);
	while (start < maxStart && Object.is(inputs[start], state[start].i)) {
		start++;
	}

	if (start === inputs.length && inputs.length === state.length) {
		return null;
	}

	const minEnd = inputs.length - maxStart + start;
	const lenDiff = inputs.length - state.length;

	let end = inputs.length - 1;
	while (end >= minEnd && Object.is(inputs[end], state[end - lenDiff].i)) {
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

	const nextState: MapArrayStateEntry<I, O>[] = [];

	for (let i = start; i < stateEnd; i++) {
		const instance = state[i];
		const index = indexByValue.get(instance.i);
		if (index === undefined) {
			instance.d();
			instance.r = true;
		} else {
			nextState[index - start] = instance;
			indexByValue.set(instance.i, nextIndexByIndex[index]);
		}
	}

	for (let i = start; i < end; i++) {
		const old = nextState[i - start];
		if (old) {
			old.s.value = i;
		} else {
			const value = inputs[i];

			const index = $(i);
			let output!: O;
			const dispose = isolate(capture, () => {
				output = fn(value, () => index.value);
			});

			nextState[i - start] = {
				i: value,
				o: output,
				s: index,
				d: dispose,
				r: false,
			};
		}
	}

	const prevState = state.splice(start, stateEnd - start, ...nextState);

	for (let i = end; i < state.length; i++) {
		state[i].s.value = i;
	}

	return {
		s: start,
		e: end,
		p: prevState,
		n: nextState,
	}
}
