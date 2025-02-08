
/** @param {import("rvx")} */
export function create({ nest }) {
	return () => {
		return nest(() => "test");
	};
}
