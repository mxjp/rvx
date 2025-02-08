# `<Nest>`
Watch an [expression](../signals.md#expressions) and render dynamic content from it's result.

=== "JSX"
	```jsx
	import { $, Nest } from "rvx";

	const message = $({ type: "heading", value: "Hello World!" });

	<Nest watch={message}>
		{message => {
			switch (message.type) {
				case "heading": return () => <h1>{message.value}</h1>;
				default: return () => <>Unknown message type.</>;
			}
		}}
	</Nest>
	```

=== "No Build"
	```jsx
	import { $, nest, e } from "./rvx.js";

	const message = $({ type: "heading", value: "Hello World!" });

	nest(message, message => {
		switch (message.type) {
			case "heading": return () => e("h1").append(message.value);
			default: return () => "Unknown message type.";
		}
	})
	```

## Signal Access & Lifecycle
All signals accessed from the `watch` expression will trigger a full re-render when updated.

=== "JSX"
	```jsx
	<Nest watch={signalA}>
		{() => signalB}
	</Nest>
	```

=== "No Build"
	```jsx
	nest(signalA, () => signalB)
	```

+ When **signalA** is updated, the expression re-runs, the previous component is disposed and the new component is rendered.
+ Updating **signalB** has no effect on the component lifecycle.

To avoid re-rendering the component when the same values are returned, you can wrap the expression using [`memo`](../signals.md#memo) or use [`<Show>`](./show.md) instead.
