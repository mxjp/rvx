# `<Nest>`
Render a [component](../components.md) returned from an expression.

=== "JSX"
	```jsx
	import { $, Nest } from "rvx";

	const message = $({ type: "heading", value: "Hello World!" });

	<Nest>
		{() => {
			const current = message.value;
			switch (current.type) {
				case "heading": return () => <h1>{current.value}</h1>;
				default: return () => <>Unknown message type.</>;
			}
		}}
	</Nest>
	```

=== "No Build"
	```jsx
	import { $, Nest, e } from "./rvx.js";

	const message = $({ type: "heading", value: "Hello World!" });

	Nest({
		children: () => {
			const current = message.value;
			switch (current.type) {
				case "heading": return () => e("h1").append(current.value);
				default: return () => "Unknown message type.";
			}
		},
	})
	```

Returning `null` or `undefined` results in rendering nothing.

## Signal Access & Lifecycle
All signals accessed from the expression will trigger a full re-render of the returned component when updated.

=== "JSX"
	```jsx
	<Nest>
		{() => {
			signalA.access();
			return () => signalB;
		}}
	</Nest>
	```

=== "No Build"
	```jsx
	Nest({
		children: () => {
			signalA.access();
			return () => signalB;
		},
	})
	```

+ When **signalA** is updated, the expression re-runs, the previous component is disposed and the new component is rendered.
+ Updating **signalB** has no effect on the expression or component lifecycle.

To avoid re-rendering the component, you can use [`memo`](../signals.md#memo) or a signal directly:

=== "JSX"
	```jsx
	function A() { ... }
	function B() { ... }

	<Nest>
		{memo(() => {
			return someSignal.value < 3 ? A : B;
		})}
	</Nest>
	```

	```jsx
	const component = $<Component | undefined>();
	<Nest>{component}</Nest>

	// Replace the component:
	component.value = () => "Hello World!";

	// Or re-render, what's already there:
	component.notify();
	```

=== "No Build"
	```jsx
	function A() { ... }
	function B() { ... }

	Nest({
		children: memo(() => {
			return someSignal.value < 3 ? A : B;
		}),
	})
	```

	```jsx
	const component = $();
	Nest({ children: component })

	// Replace the component:
	component.value = () => "Hello World!";

	// Or re-render, what's already there:
	component.notify();
	```
