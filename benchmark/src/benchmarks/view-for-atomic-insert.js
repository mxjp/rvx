import { mulberry32 } from "../common/mulberry32.js";

const itemCount = 50;

export const multiplier = itemCount;

/** @param {import("rvx")} */
export function create({ $, forEach }) {
	const random = mulberry32();
	const sequence = [];
	for (let i = 0; i < itemCount; i++) {
		const prev = sequence[i - 1] ?? [];
		sequence.push(prev.toSpliced(random() % prev.length, 0, i + 1));
	}
	return () => {
		const signal = $(sequence[0]);
		const view = forEach(signal, (item, index) => [item, index]);
		for (let i = 1; i < sequence.length; i++) {
			signal.value = sequence[i];
		}
		return view;
	};
}
