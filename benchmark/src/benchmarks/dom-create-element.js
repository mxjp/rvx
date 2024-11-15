
export const startSampleSize = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, ENV, WINDOW }) {
	return () => {
		ENV.inject(WINDOW, () => {
			e("div")
				.set("title", "Hello World!")
				.set("key", "some-key")
				.class(["foo", "bar"])
				.style({
					"color": "red",
					"width": () => "100px",
				})
				.on("click", () => {})
				.append(
					"text",
					() => "expression",
				);
		});
	};
}
