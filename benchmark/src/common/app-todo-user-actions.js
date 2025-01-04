import { mulberry32 } from "./mulberry32.js";

const addCount = 100;
const setDoneAndRemoveCount = 50;

export const multiplier = addCount + (setDoneAndRemoveCount * 2);

/**
 * @param {import("rvx")}
 * @param {boolean} onscreen
 */
export function createBenchmark({ capture, render, sig, e, teardown, For, Show }, onscreen) {
	const random = mulberry32();

	/**
	 * @param {object} props
	 * @param {import("rvx").Signal<string>} props.value
	 * @param {import("rvx").ClassValue} props.class
	 * @param {() => void} props.action
	 */
	function TextInput(props) {
		const input = e("input")
			.set("type", "text")
			.class(props.class)
			.prop("value", props.value)
			.on("input", () => {
				props.value.value = input.value;
			})
			.on("keydown", e => {
				if (props.action && e.key === "Enter") {
					props.action();
					e.stopImmediatePropagation();
					e.preventDefault();
				}
			})
			.elem;
		return input;
	}

	/**
	 * @param {object} props
	 * @param {() => void} props.action
	 * @param {unknown} props.children
	 */
	function Button(props) {
		return e("button")
			.set("type", "button")
			.class("some-button-class")
			.on("click", e => {
				props.action();
				e.stopImmediatePropagation();
				e.preventDefault();
			})
			.append(props.children);
	}

	return () => {

		/** @type {import("rvx").View} */
		let app;

		const dispose = capture(() => {
			/**
			 * @type {import("rvx").Signal<{
			 *   name: import("rvx").Signal<string>,
			 *   done: import("rvx").Signal<boolean>
			 * }[]>}
			 */
			const todos = sig([]);
			const name = sig("");

			app = render([
				e("h1").class("header").append("Todo App"),
				e("div").class("row").append(
					TextInput({ value: name, class: "grow" }),
					Button({ children: "Add", action: () => {
						todos.update(todos => {
							todos.push({
								name: sig(name.value),
								done: sig(false),
							});
						});
						name.value = "";
					} }),
				),
				e("ul").append(
					For({
						each: todos,
						children: item => {
							return e("li")
								.class({
									"item": true,
									"done": item.done,
								})
								.append(
									TextInput({ value: item.name }),
									Show({
										when: item.done,
										children: () => [
											Button({
												children: "Undone",
												action: () => item.done.value = false,
											}),
											Button({
												children: "Remove",
												action: () => {
													todos.update(todos => {
														todos.splice(todos.indexOf(item), 1);
													});
												},
											}),
										],
										else: () => [
											Button({
												children: "Done",
												action: () => item.done.value = true,
											}),
										],
									}),
								);
						},
					})
				),
			]);
			if (onscreen) {
				app.appendTo(document.body);
				teardown(() => app.detach());
			}
		});

		/**
		 * @param {string} name
		 */
		function addItem(name) {
			const row = app.first.nextSibling;
			const input = row.firstChild;
			input.value = name;
			input.dispatchEvent(new Event("input"));
			row.lastChild.click();

			const item = app.last.lastChild.firstChild;
			if (item.value !== name) {
				throw new Error("adding item failed");
			}
		}

		function setDoneAndRemoveRandom() {
			const items = app.last;
			const count = items.childNodes.length - 1; // 1 for the <For> placeholder comment.
			const item = items.childNodes.item((random() % count) + 1); // 1 for the <For> placeholder comment.
			if (item.lastChild.textContent !== "Done") {
				throw new Error("done button not found");
			}
			item.lastChild.click();
			if (item.lastChild.textContent !== "Remove") {
				throw new Error("remove button not found");
			}
			item.lastChild.click();
			if (items.childNodes.length - 1 !== count - 1 || item.parentNode) {
				throw new Error("item was not removed");
			}
		}

		try {
			for (let i = 0; i < addCount; i++) {
				addItem(`item${i}`);
			}
			for (let i = 0; i < setDoneAndRemoveCount; i++) {
				setDoneAndRemoveRandom();
			}
		} finally {
			dispose();
		}
	};
}
