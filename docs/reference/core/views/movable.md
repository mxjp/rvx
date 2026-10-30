# Movable Content
Using content in multiple places at once is not supported and will result in undefined behavior.

When you want to safely reuse, keep alive or move content, you can create a component that automatically removes content from its previous place when used again.

=== "JSX"
	```jsx
	import { movable } from "rvx";

	// Wrap arbitrary content:
	const Content = movable(<>Hello World!</>);

	// Render the content and remove it from its previous place:
	<Content />;
	```

=== "No Build"
	```jsx
	import { movable } from "./rvx.js";

	// Wrap arbitrary content:
	const content = movable("Hello World!");

	// Render the content and remove it from its previous place:
	e("div").append(content());
	```

The content is rendered once and reused:

=== "JSX"
	```jsx
	import { movable, Show } from "rvx";

	const content = movable(<input type="text" prop:value="Hello World!" />);

	<>
		<Show when={a}>
			{content}
		</Show>
		<Show when={b}>
			{content}
		</Show>
	</>
	```

=== "No Build"
	```jsx
	import { movable, when } from "./rvx.js";

	const content = movable(e("input").set("type", "text").prop("value", "Hello World!"));

	[
		when(a, content),
		when(b, content),
	]
	```

For just keeping content alive and conditionally rendering it in the same place, consider using [`<Attach>`](./attach.md) instead of `movable`.
