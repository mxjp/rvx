
const observerCount = 100;
const dispatchCount = 10;

export const multiplier = observerCount * dispatchCount;

/** @param {import("rvx")} */
export function create({ $, watch, dispatch }) {
	return () => {
		const signal = $(0);
		for (let i = 0; i < observerCount; i++) {
			watch(() => signal.access(), () => {});
		}
		for (let i = 0; i < dispatchCount; i++) {
			signal.value++;
			dispatch();
		}
	};
}
