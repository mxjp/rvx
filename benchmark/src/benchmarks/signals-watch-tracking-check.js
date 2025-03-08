
export const multiplier = 1000;

/** @param {import("rvx")} */
export function create({ watch, isTracking }) {
	return () => {
		watch(() => {
			return isTracking();
		}, () => {
			return isTracking();
		});
	};
}
