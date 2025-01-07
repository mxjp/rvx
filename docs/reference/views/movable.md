# Movable Views
Using views in multiple places at once is not supported and will result in undefined behavior.

When you want to safely reuse, keep alive or move content, you can wrap content as a movable view to automatically remove it from it's previous place when used concurrently.

=== "JSX"
	```jsx
	import { movable, MovableView } from "rvx";

	// Wrap arbitrary content:
	const wrapper = movable(<>Hello World!</>);

	// Wrap an existing view:
	const wrapper = new MovableView(someOtherView);

	// Remove content from all other instances and create a new one:
	const view = wrapper.move();

	// Remove content from all other instances:
	wrapper.detach();
	```

=== "No Build"
	```jsx
	import { movable, MovableView } from "./rvx.js";

	// Wrap arbitrary content:
	const wrapper = movable("Hello World!");

	// Wrap an existing view:
	const wrapper = new MovableView(someOtherView);

	// Remove content from all other instances and create a new one:
	const view = wrapper.move();

	// Remove content from all other instances:
	wrapper.detach();
	```

For just keeping content alive and conditionally rendering it in the same place, consider using [`<Attach>`](./attach.md) instead of movable views.

## Examples

Rendering content from a signal:

=== "JSX"
	```jsx
	const content = $<MovableView | undefined>();

	// .move can be directly used as a component:
	<Nest>{() => content.value?.move}</Nest>

	content.value = movable(<>Hello World!</>);
	```

=== "No Build"
	```jsx
	const content = $<MovableView | undefined>();

	// .move can be directly used as a component:
	Nest({ children: () => content.value?.move })

	content.value = movable(<>Hello World!</>);
	```

<br>

Moving a view into a specific position in a list:

=== "JSX"
	```jsx
	const wrapper = movable(<>Current item</>);
	const currentIndex = $(0);

	<For each={items}>
		{(item, index) => {
			return <li>
				{/* Move the view into this item if it's the current one: */}
				<Show when={() => currentIndex.value === index()}>
					{wrapper.move}
				</Show>
			</li>;
		}}
	</For>
	```

=== "No Build"
	```jsx
	const wrapper = movable(<>Current item</>);
	const currentIndex = $(0);

	For({
		each: items,
		children: (item, index) => e("li").append(
			Show({
				when: () => currentIndex.value === index(),
				children: wrapper.move,
			}),
		),
	})
	```
