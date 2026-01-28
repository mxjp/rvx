/*

# Todo App (Builder API)
This is a basic todo app with browser backed storage using only rvx's core features.

*/

import { $, Signal, e, forEach, watch, when } from "rvx";

const STORAGE_KEY = "rvx-examples:todo-app";

export function Example() {
	const name = $("");

	// Load items from storage by converting the
	// json representation into objects with signals:
	const items = $<Item[]>([]);
	try {
		const json = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ItemJson[];
		items.value = json.map(item => ({ name: $(item.name), done: $(item.done) }));
	} catch (error) {
		console.error(error);
	}

	function add() {
		if (name.value) {
			items.update(items => {
				items.push({ name: $(name.value), done: $(false) });
			});
			name.value = "";
		}
	}

	// Watch the json representation to save it when something changes:
	watch(() => {
		return items.value.map(item => ({
			name: item.name.value,
			done: item.done.value,
		}));
	}, json => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
		} catch (error) {
			console.error(error);
		}
	});

	return e("div").class("column").append(
		e("div").class("row").append(
			TextInput({ value: name, action: add }),
			e("button").on("click", add).append("Add"),
		),
		e("ul").append(
			forEach(items, item => e("li").class("row").append(
				TextInput({ value: item.name }),
				when(item.done, () => [
					e("button").on("click", () => { item.done.value = false }).append("Undone"),
					e("button").on("click", () => {
						items.update(items => {
							items.splice(items.indexOf(item), 1);
						});
					}).append("Remove"),
				], () => [
					e("button").on("click", () => { item.done.value = true }).append("Done"),
				]),
			)),
		),
	);
}

function TextInput(props: {
	value: Signal<string>;
	action?: () => void;
}) {
	return e("input")
		.set("type", "text")
		.prop("value", props.value)
		.on("input", event => {
			props.value.value = (event.target as HTMLInputElement).value;
		})
		.on("keydown", event => {
			if (event.key === "Enter" && props.action) {
				event.preventDefault();
				props.action();
			}
		});
}

interface ItemJson {
	name: string;
	done: boolean;
}

interface Item {
	name: Signal<string>;
	done: Signal<boolean>;
}
