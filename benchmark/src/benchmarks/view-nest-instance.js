
/** @param {import("rvx")} */
export function create({ Nest }) {
	return () => {
		return Nest({
			children: () => {
				return () => "test";
			},
		});
	};
}
