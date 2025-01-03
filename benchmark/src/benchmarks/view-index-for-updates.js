import { mulberry32 } from "../common/mulberry32.js";

const random = mulberry32();

const minItemCount = 15;
const maxItemCount = 25;
const sequenceCount = 20;
const sequence = [];

for (let s = 0; s < sequenceCount; s++) {
	const itemCount = minItemCount + random() % (1 + maxItemCount - minItemCount);
	const items = [];
	for (let i = 0; i < itemCount; i++) {
		items.push(random() % maxItemCount);
	}
	sequence.push(items);
}

export const multiplier = sequence.flat().length;

/** @param {import("rvx")} */
export function create({ IndexFor, sig }) {
	return () => {
		const signal = sig(sequence[0]);
		const view = IndexFor({
			each: signal,
			children: (item, index) => {
				return [item, index];
			},
		});
		for (let i = 1; i < sequence.length; i++) {
			signal.value = sequence[i];
		}
		return view;
	};
}
