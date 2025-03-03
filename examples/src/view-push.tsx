/*

# Custom View / Push
This example shows a custom view that pushes elements onto itself.

This can be useful when you only ever append or prepend elements and you require the absolute best performance possible.

*/

import { $, capture, Component, Nest, render, teardown, TeardownHook, View } from "rvx";
import { Emitter, Event } from "rvx/event";

export function Example() {
	const reset = $();
	const actions = new Emitter<[Action, number]>();

	return <div class="column">
		<div class="row">
			<button on:click={() => actions.emit("prepend", Math.random())}>Prepend</button>
			<button on:click={() => actions.emit("append", Math.random())}>Append</button>
			<button on:click={() => reset.notify()}>Reset</button>
		</div>
		<ul>
			{/*
				Combine with <Nest> to reset the
				inner state when "reset" is updated:
			*/}
			<Nest watch={reset}>
				{() => <PushView actions={actions.event}>
					{item => {
						return <li>{item}</li>;
					}}
				</PushView>}
			</Nest>
		</ul>
	</div>;
}

type Action = "prepend" | "append";

function PushView<T>(props: {
	children: Component<T>;
	actions: Event<[Action, T]>;
}) {
	return new View((setBoundary, self) => {
		// Keep an array of teardown hooks to dispose instances later:
		const dispose: TeardownHook[] = [];
		teardown(() => dispose.forEach(h => h()));

		// Create an initial anchor element:
		const anchor = document.createComment("");
		setBoundary(anchor, anchor);

		// Handle action events:
		props.actions((action, item) => {
			let parent: Node | null = anchor.parentElement;
			if (!parent) {
				// Create a parent if there is none:
				parent = document.createDocumentFragment();
				parent.appendChild(anchor);
			}

			// Render the item into a view & capture it's lifecycle:
			let view!: View;
			dispose.push(capture(() => {
				view = render(props.children(item));
			}));

			// Append or prepend the item view to this one:
			if (action === "append") {
				const next = self.last!.nextSibling;
				if (next) {
					view.insertBefore(parent, next);
				} else {
					view.appendTo(parent);
				}
				setBoundary(undefined, view.last);
			} else {
				view.insertBefore(parent, self.first!);
				setBoundary(view.first, undefined);
			}
		});
	});
}
