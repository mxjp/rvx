/*

# Todo App (JSX)
This is a basic todo app with browser backed storage using only rvx's core features.

Note, that this example doesn't include any storage error handling or validation.

*/

import { $, For, Show, Signal, watch } from "rvx";

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

	return <div class="column">
		<div class="row">
			<TextInput value={name} action={add} />
			<button on:click={add}>Add</button>
		</div>
		<ul>
			<For each={items}>
				{item => <li class="row">
					<TextInput value={item.name} />
					<Show
						when={item.done}
						else={() => <>
							<button on:click={() => { item.done.value = true }}>Done</button>
						</>}
					>
						{() => <>
							<button on:click={() => { item.done.value = false }}>Undone</button>
							<button on:click={() => {
								items.update(items => {
									items.splice(items.indexOf(item), 1);
								});
							}}>Remove</button>
						</>}
					</Show>
				</li>}
			</For>
		</ul>
	</div>;
}

function TextInput(props: {
	value: Signal<string>;
	action?: () => void;
}) {
	return <input
		type="text"
		prop:value={props.value}
		on:input={event => {
			props.value.value = (event.target as HTMLInputElement).value;
		}}
		on:keydown={event => {
			if (event.key === "Enter" && props.action) {
				event.preventDefault();
				props.action();
			}
		}}
	/>;
}

interface ItemJson {
	name: string;
	done: boolean;
}

interface Item {
	name: Signal<string>;
	done: Signal<boolean>;
}
