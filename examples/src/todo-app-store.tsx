/*

# Todo App (Store API)
This is a basic todo app with browser backed storage using only rvx's store API.

Note, that this example doesn't include any storage error handling or validation.

*/

import { $, For, Show, Signal, watch } from "rvx";
import { reflect, wrap } from "rvx/store";

const STORAGE_KEY = "rvx-examples:todo-app";

export function Example() {
	const name = $("");

	// Load items from storage by creating a
	// deep reactive wrapper for the items array:
	let items: Item[];
	try {
		items = wrap(JSON.parse(localStorage.getItem(STORAGE_KEY)!) ?? []);
	} catch (error) {
		items = wrap([]);
		console.error(error);
	}

	function add() {
		if (name.value) {
			// Since "items" is a reactive wrapper, it can be modified directly:
			items.push({ name: name.value, done: false });
			name.value = "";
		}
	}

	watch(() => {
		try {
			// "JSON.stringify" accesses all reactive properties of "items"
			// and will cause this function to re-run when anything changes:
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
					<TextInput value={reflect(item, "name")} />
					<Show
						when={() => item.done}
						else={() => <>
							<button on:click={() => { item.done = true }}>Done</button>
						</>}
					>
						{() => <>
							<button on:click={() => { item.done = false }}>Undone</button>
							<button on:click={() => {
								items.splice(items.indexOf(item), 1);
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

interface Item {
	name: string;
	done: boolean;
}
