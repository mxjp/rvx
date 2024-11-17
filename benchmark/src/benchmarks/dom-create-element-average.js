
export const startSampleSize = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	return () => {
		ENV.inject(WINDOW, () => {
			e("div")
				.set("foo", "a")
				.set("bar", "b")
				.set("baz", "c")
				.set("baz", "d")
				.class(["foo", "bar", "baz", "boo"])
				.style({
					"foo": "a",
					"bar": "b",
					"baz": "c",
					"boo": "d",
				});
		});
	};
}
