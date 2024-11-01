
export const startSampleSize = 1000;

/** @param {import("rvx")} */
export function create({ jsx }) {
	return () => {
		jsx("div", {
			title: "Hello World!",
			class: {
				"foo": () => true,
				"bar": true,
			},
			style: {
				"color": "red",
				"width": () => "100px",
			},
			"on:click": () => {},
			children: [
				"text",
				() => "expression",
			],
		}, "some-key");
	};
}
