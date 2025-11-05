
const signalCount = 100;
const batchCount = 10;

export const multiplier = signalCount * batchCount;

/** @param {import("rvx")} */
export function create({ $, watch, batch }) {
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
		for (let i = 0; i < batchCount; i++) {
			batch(() => {
				for (let i = 0; i < signalCount; i++) {
					signals[i].value++;
				}
			});
		}
	};
}
