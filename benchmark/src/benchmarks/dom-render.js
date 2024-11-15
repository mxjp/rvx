
export const multiplier = 1000;

/** @param {import("rvx") & import("rvx/dom")} */
export function create({ e, WINDOW, ENV }) {
	const root = ENV.inject(WINDOW, () => {
		return e("div")
			.class(["foo", "bar"])
			.style({
				foo: "bar",
				baz: "boo",
			})
			.set("title", "Hello World!")
			.append(
				"Some text...",
				"&&<<<>>>>&&&;;&&<<;;>>><>>&&",
				e("h1").class("title").append("Some text..."),
				e("ul").class("list").append(
					e("li").append("Item A"),
					e("li").append("Item B"),
					e("li").append("Item C"),
				)
			)
			.elem;
	});

	return () => {
		for (let i = 0; i < multiplier; i++) {
			const _ = root.outerHTML;
		}
	};
}
