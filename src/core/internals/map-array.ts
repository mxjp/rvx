import { $, capture, isolate, Signal, teardown, TeardownHook } from "../signals.js";

export type MapArrayFn<I, O> = (input: I, index: () => number) => O;

export type MapArrayKeyFn<K, I> = (input: I) => K;

export interface MapArrayStateEntry<K, O> {
	/** key */
	k: K;
	/** output */
	o: O;
	/** index */
	s: Signal<number>,
	/** dispose */
	d: TeardownHook,
	/** removed */
	r: boolean,
}

export interface MapArrayUpdate<K, I, O> {
	/** inclusive start index in new state */
	s: number;
	/** exclusive end index in new state */
	e: number;
	/** previous chunk */
	p: MapArrayStateEntry<K, O>[];
	/** next chunk */
	n: MapArrayStateEntry<K, O>[];
}

export function createMapArrayState<K, I, O>() {
	const state: MapArrayStateEntry<K, O>[] = [];
	teardown(() => {
		for (let i = 0; i < state.length; i++) {
			state[i].d();
		}
	});
	return state;
}

function createEntry<K, I, O>(key: K, value: I, index: number, fn: MapArrayFn<I, O>): MapArrayStateEntry<K, O> {
	const signal = $(index);
	let output!: O;
	const dispose = isolate(capture, () => {
		output = fn(value, () => signal.value);
	});
	return {
		k: key,
		o: output,
		s: signal,
		d: dispose,
		r: false,
	};
}

const INPUT_IS_KEY = <K, I>(input: I) => input as unknown as K;

export function mapArrayUpdate<K, I, O>(state: MapArrayStateEntry<K, O>[], rawInput: Iterable<I>, fn: MapArrayFn<I, O>, keyFn: MapArrayKeyFn<K, I> = INPUT_IS_KEY): MapArrayUpdate<K, I, O> | null {
	const inputs: I[] = Array.isArray(rawInput) ? rawInput : Array.from(rawInput);

	let start = 0;
	const maxStart = Math.min(state.length, inputs.length);
	while (start < maxStart && Object.is(keyFn(inputs[start]), state[start].k)) {
		start++;
	}

	if (start === inputs.length && inputs.length === state.length) {
		return null;
	}

	const minEnd = inputs.length - maxStart + start;
	const lenDiff = inputs.length - state.length;
	let end = inputs.length - 1;
	while (end >= minEnd && Object.is(keyFn(inputs[end]), state[end - lenDiff].k)) {
		end--;
	}
	end++;
	const stateEnd = end - lenDiff;

	const nextState: MapArrayStateEntry<K, O>[] = [];
	if ((end - lenDiff - start) === 0) {
		for (let i = start; i < end; i++) {
			const input = inputs[i];
			nextState[i - start] = createEntry(keyFn(input), input, i, fn);
		}
	} else {
		const indexByKey = new Map<K, number>();
		const nextIndexByIndex: number[] = [];
		for (let i = end - 1; i >= start; i--) {
			const key = keyFn(inputs[i]);
			const next = indexByKey.get(key);
			if (next !== undefined) {
				nextIndexByIndex[i] = next;
			}
			indexByKey.set(key, i);
		}

		for (let i = start; i < stateEnd; i++) {
			const instance = state[i];
			const index = indexByKey.get(instance.k);
			if (index === undefined) {
				instance.d();
				instance.r = true;
			} else {
				nextState[index - start] = instance;
				indexByKey.set(instance.k, nextIndexByIndex[index]);
			}
		}

		for (let i = start; i < end; i++) {
			const old = nextState[i - start];
			if (old) {
				old.s.value = i;
			} else {
				const input = inputs[i];
				nextState[i - start] = createEntry(keyFn(input), input, i, fn);
			}
		}
	}

	const prevState = state.splice(start, stateEnd - start, ...nextState);

	if (stateEnd !== end) {
		for (let i = end; i < state.length; i++) {
			state[i].s.value = i;
		}
	}

	return {
		s: start,
		e: end,
		p: prevState,
		n: nextState,
	}
}
