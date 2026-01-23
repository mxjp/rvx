import { createMapArrayState, MapArrayFn, mapArrayInput, mapArrayUpdate } from "./internals/map-array.js";
import { $, Expression, watch } from "./signals.js";

export { MapArrayFn } from "./internals/map-array.js";

export function mapArray<I, O>(inputs: Expression<Iterable<I>>, fn: MapArrayFn<I, O>): () => O[] {
	const state = createMapArrayState<I, O>();
	const output = $<O[]>([]);
	watch(mapArrayInput(inputs), inputs => {
		const update = mapArrayUpdate(state, inputs, fn);
		if (update !== null) {
			output.value.splice(update.s, update.p.length, ...update.n.map(s => s.o));
			output.notify();
		}
	});
	return () => output.value;
}
