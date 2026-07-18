import { createMapArrayState, MapArrayFn, MapArrayKeyFn, mapArrayUpdate } from "./internals/map-array.js";
import { $, Expression, get, watch } from "./signals.js";

export { MapArrayFn, MapArrayKeyFn } from "./internals/map-array.js";

/**
 * Map each entry in an iterable expression until the current lifecycle is disposed.
 *
 * + The current context is available in the map function.
 * + Evaluation is stopped when the current lifecycle is disposed.
 * + Teardown hooks from within the map function are called when an entry is removed or when the current lifecycle is disposed.
 * + Returns a function to reactively access the latest result.
 *
 * @param keyFn A function to get the key for a given value. If not specified, the value is used as key.
 */
export function mapArray<I, O>(inputs: Expression<Iterable<I>>, fn: MapArrayFn<I, O>, keyFn?: MapArrayKeyFn<unknown, I>): () => O[] {
	const state = createMapArrayState<unknown, I, O>();
	const output = $<O[]>([]);
	watch(() => {
		const update = mapArrayUpdate(state, get(inputs), fn, keyFn);
		if (update !== null) {
			output.inert.splice(update.s, update.p.length, ...update.n.map(s => s.o));
			output.notify();
		}
	});
	return () => output.value;
}
