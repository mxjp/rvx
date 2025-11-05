
const observerCount = 100;
const batchCount = 10;

export const multiplier = observerCount * batchCount;

/** @param {import("rvx")} */
export function create({ $, watch, batch }) {
	return () => {
		const signal = $(0);
		for (let i = 0; i < observerCount; i++) {
			watch(() => signal.access(), () => {});
		}
		for (let i = 0; i < batchCount; i++) {
			batch(() => {
				signal.value++;
			});
		}
	};
}
