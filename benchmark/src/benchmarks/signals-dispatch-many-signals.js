
const signalCount = 100;
const dispatchCount = 10;

export const multiplier = signalCount * dispatchCount;

/** @param {import("rvx")} */
export function create({ $, watch, dispatch }) {
	return () => {
		const signals = [];
		for (let i = 0; i < signalCount; i++) {
			signals.push($(0));
		}
		watch(() => {
			for (let i = 0; i < signalCount; i++) {
				signals[i].access();
			}
		}, () => {});
		for (let i = 0; i < dispatchCount; i++) {
			for (let i = 0; i < signalCount; i++) {
				signals[i].value++;
			}
			dispatch();
		}
	};
}
