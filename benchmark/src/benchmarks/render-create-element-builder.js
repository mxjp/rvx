
export const startSampleSize = 1000;

/** @param {import("rvx")} */
export function create({ e }) {
	return () => {
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
	};
}
