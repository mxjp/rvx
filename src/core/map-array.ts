import { MapArrayFn, MapArrayStateEntry, mapArrayUpdate } from "./internals/map-array.js";
import { teardown } from "./lifecycle.js";
import { $, Expression, get, watch } from "./signals.js";

export { MapArrayFn } from "./internals/map-array.js";

export function mapArray<I, O>(inputs: Expression<Iterable<I>>, fn: MapArrayFn<I, O>): () => O[] {
	const state: MapArrayStateEntry<I, O>[] = [];
	const output = $<O[]>([]);
	teardown(() => {
		for (let i = 0; i < state.length; i++) {
			state[i].d();
		}
	});
	watch(() => {
		const raw = get(inputs);
		return Array.isArray(raw) ? raw as I[] : Array.from(raw);
	}, inputs => {
		const update = mapArrayUpdate(state, inputs, fn);
		if (update !== null) {
			output.value.splice(update.s, update.p.length, ...update.n.map(s => s.o));
			output.notify();
		}
	});
	return () => output.value;
}
