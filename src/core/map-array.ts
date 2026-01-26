import { createMapArrayState, MapArrayFn, mapArrayUpdate } from "./internals/map-array.js";
import { $, Expression, get, untrack, watch } from "./signals.js";

export { MapArrayFn } from "./internals/map-array.js";

/**
 * Run a function for each value in an iterable expression keyed by value.
 *
 * + The current context is available in the map function.
 * + Evaluation is stopped when the current lifecycle is disposed.
 * + Teardown hooks from within the map function are called when a value is removed or when the current lifecycle is disposed.
 * + Returns a function to reactively access the latest result.
 */
export function mapArray<O, I>(inputs: Expression<Iterable<I>>, fn: MapArrayFn<I, O>): () => O[] {
	const state = createMapArrayState<I, O>();
	const output = $<O[]>([]);
	watch(() => {
		const update = mapArrayUpdate(state, get(inputs), fn);
		if (update !== null) {
			untrack(output).splice(update.s, update.p.length, ...update.n.map(s => s.o));
			output.notify();
		}
	});
	return () => output.value;
}
