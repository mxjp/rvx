# Wrapping Content
The `mount` and `render` functions can be used to create a view from arbitrary [supported content](../elements.md#content).

=== "JSX"
	```jsx
	import { render } from "rvx";

	const view = render(<>Hello World!</>);
	```

=== "No Build"
	```jsx
	import { render } from "rvx";

	const view = render("Hello World!");
	```

The `mount` function also appends the created view to a parent node until the current [lifecycle](../lifecycle.md) is disposed.

=== "JSX"
	```jsx
	import { mount } from "rvx";

	mount(document.body, <>Hello World!</>);
	```

=== "No Build"
	```jsx
	import { mount } from "rvx";

	mount(document.body, "Hello World!");
	```

## Portalling
In addition to being the entry point of your application, the `mount` function allows you to render content into a different part of the DOM. This is commonly known as "portalling" in other frameworks.

!!! warning
	Avoid directly mounting content into other places rendered by rvx.

	If you need to, you can provide a slot that other code can render into using [`<Nest> / nest`](./nest.md) or read about [external mutations](../../advanced-topics/external-mutations.md).

=== "JSX"
	```jsx
	import { mount, capture } from "rvx";

	// Mount some content and capture it's lifecycle:
	const unmount = capture(() => {
		mount(document.body, <>Hello World!</>);
	});

	// Unmount:
	unmount();
	```

=== "No Build"
	```jsx
	import { mount, capture } from "./rvx.js";

	// Mount some content and capture it's lifecycle:
	const unmount = capture(() => {
		mount(document.body, "Hello World!");
	});

	// Unmount:
	unmount();
	```

This can be used to implement things like popovers, dialogs or any other kind of floating content:

=== "JSX"
	```jsx
	import { $, mount, watch } from "rvx";

	function ExamplePopover() {
		const visible = $(false);

		// Watch automatically takes care of the lifecycle:
		watch(visible, visible => {
			if (visible) {
				mount(document.body, <div>Hello World!</div>);
			}
		});

		return <button on:click={() => { visible.value = !visible.value }}>
			Toggle Popover
		</button>;
	}
	```

=== "No Build"
	```jsx
	import { $, mount, watch, e } from "./rvx.js";

	function ExamplePopover() {
		const visible = $(false);

		// Watch automatically takes care of the lifecycle:
		watch(visible, visible => {
			if (visible) {
				mount(document.body, e("div").append("Hello World!"));
			}
		});

		return e("button").on("click", () => { visible.value = !visible.value }).append(
			"Toggle Popover",
		);
	}
	```
