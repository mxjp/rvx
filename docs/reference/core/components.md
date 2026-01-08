# Components
In rvx, components are functions that return any type of [supported content](elements.md#content).

=== "JSX"
	```jsx
	function Message() {
		return <h1>Hello World!</h1>;
	}

	<Message />
	```

=== "No Build"
	```jsx
	function Message() {
		return e("h1").append("Hello World!");
	}

	Message()
	```

## Properties
Properties are passed via the first argument as is:

=== "JSX"
	```jsx
	function Message(props: { text: string; }) {
		return <h1>{props.text}</h1>;
	}

	<Message text="Hello World!" />
	```

=== "No Build"
	```jsx
	/**
	 * @param {object} props
	 * @param {string} props.text
	 */
	function Message(props) {
		return e("h1").append(props.text);
	}

	Message({ text: "Hello World!" })
	```

In JSX, children are passed as the `children` property.

=== "JSX"
	```jsx
	function Message(props: { children?: unknown; }) {
		return <h1>{props.children}</h1>;
	}

	<Message>Hello World!</Message>
	```

=== "No Build"
	When not using JSX, the `children` property is still recommended for consistency, but not a requirement.

	```jsx
	/**
	 * @param {object} props
	 * @param {unknown} props.children
	 */
	function Message(props) {
		return e("h1").append(props.children);
	}

	Message({ children: "Hello World!" })
	```

### Expressions
By default, all component properties are static. To accept reactive inputs, use the [`Expression`](signals.md#expressions) type.

=== "JSX"
	```jsx
	import { $, Expression } from "rvx";

	function Counter(props: { value: Expression<number>; }) {
		return <>Current count: {props.value}</>;
	}

	const count = $(42);

	// Static values:
	<Counter value={count.value} />

	// Reactive values:
	<Counter value={count} />
	<Counter value={() => count.value} />
	```

=== "No Build"
	```jsx
	import { $ } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").Expression<number>} props.value
	 */
	function Counter(props) {
		return ["Current count: ", props.value];
	}

	const count = $(42);

	// Static values:
	Counter({ count: 42 })
	Counter({ count: count.value })

	// Reactive values:
	Counter({ count: count })
	Counter({ count: () => count.value })
	```

In cases where static values never make sense, you can use `Reactive` instead of the `Expression` type to disallow static values:

=== "JSX"
	```jsx
	import { Reactive } from "rvx";

	function Counter(props: { value: Reactive<number>; }) {
		return <>Current count: {props.value}</>;
	}
	```

=== "No Build"
	```jsx
	/**
	 * @param {object} props
	 * @param {import("./rvx.js").Reactive<number>} props.value
	 */
	function Counter(props) {
		return ["Current count: ", props.value];
	}
	```

### Signals
To support data flow in both directions, you can use [signals](signals.md) as properties.

=== "JSX"
	```jsx
	import { $, Signal } from "rvx";

	function Counter(props: { value: Signal<number>; }) {
		return <button on:click={() => { props.value.value++ }}>
			Count: {props.value}
		</button>;
	}

	const count = $(0);
	<Counter value={count} />
	```

=== "No Build"
	```jsx
	import { $, e } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").Signal<number>} props.value
	 */
	function Counter(props) {
		return e("button").on("click", () => { props.value.value++ }).append(
			"Count: ", props.value,
		);
	}

	const count = $(0);
	Counter({ value: count })
	```

Using signals for two way data flow also allows converting values in both directions in a nicely composable way.

The example below shows a basic text input and a [`trim`](../convert.md#trim) function for trimming user input:

=== "JSX"
	```jsx
	import { $, Signal, watchUpdates } from "rvx";

	function TextInput(props: { value: Signal<string>; }) {
		return <input
			type="text"
			prop:value={props.value}
			on:input={event => {
				props.value.value = (event.target as HTMLInputElement).value;
			}}
		/>;
	}

	function trim(source: Signal<string>) {
		// The second parameter is metadata to let other APIs
		// know that "input" has been derived from "source":
		const input = $(source.value, source);

		// Update the source signal if the input changes:
		watchUpdates(input, value => {
			source.value = value.trim();
		});

		// Update the input signal if the source changes:
		watchUpdates(source, value => {
			if (value !== input.value.trim()) {
				input.value = value;
			}
		});

		return input;
	}

	const text = $("");

	// This input uses the "text" signal as is:
	<TextInput value={text} />

	// This input uses the "trim" function to store the
	// trimmed version of the input in the "text" signal:
	<TextInput value={trim(text)} />

	// The signal's pipe function does the same but is more
	// readable when using multiple derivations:
	<TextInput value={text.pipe(trim).pipe(...)} />
	```

=== "No Build"
	```jsx
	import { $, watchUpdates, e } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").Signal<string>} props.value
	 */
	function TextInput(props) {
		return e("input")
			.set("type", "text")
			.prop("value", props.value)
			.on("input", event => props.value.value = event.target.value);
	}

	/**
	 * @param {import("./rvx.js").Signal<string>} source
	 */
	function trim(source) {
		// The second parameter is metadata to let other APIs
		// know that "input" has been derived from "source":
		const input = $(source.value, source);

		// Update the source signal if the input changes:
		watchUpdates(input, value => {
			source.value = value.trim();
		});

		// Update the input signal if the source changes:
		watchUpdates(source, value => {
			if (value !== input.value.trim()) {
				input.value = value;
			}
		});

		return input;
	}

	const text = $("");

	// This input uses the "text" signal as is:
	TextInput({ value: text })

	// This input uses the "trim" function to store the
	// trimmed version of the input in the "text" signal:
	TextInput({ value: trim(text) })

	// The signal's pipe function does the same but is more
	// readable when using multiple derivations:
	TextInput({ value: text.pipe(trim).pipe(...) })
	```

### Forwarding special attributes
Sometimes it can be useful to forward properties to the root element of a component for allowing the user of the component to set `class`, `style` or any other attributes.

=== "JSX"
	```jsx
	import { ClassValue, StyleValue } from "rvx";

	function Button(props: {
		class?: ClassValue;
		style?: StyleValue;
		id?: Expression<string | undefined>;
		...
	}) {
		return <button
			class={props.class}
			style={props.style}
			id={props.id}
		>...</button>;
	}
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").ClassValue} props.class
	 * @param {import("./rvx.js").StyleValue} props.style
	 * @param {import("./rvx.js").Expression<string | undefined>} props.id
	 */
	function Button(props) {
		return e("button")
			.class(props.class)
			.style(props.style)
			.set("id", props.id)
			.append(...);
	}
	```

In case of the `class` and `style` attributes, you can use an array as value to mix properties with values from within your component:

=== "JSX"
	```jsx
	import { ClassValue, StyleValue } from "rvx";

	function Button(props: {
		class?: ClassValue;
		style?: StyleValue;
		...
	}) {
		return <button
			class={[props.class, "example"]}
			style={[props.style, { color: "red" }]}
			...
		>...</button>;
	}
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").ClassValue} props.class
	 * @param {import("./rvx.js").StyleValue} props.style
	 */
	function Button(props) {
		return e("button")
			.class([props.class, "example"])
			.style([props.style, { color: "red" }])
			.append(...);
	}
	```

### Overwriting properties
For components that always return a top level element, you can overwrite properties that are not explicitly supported by that component.

!!! warning
	Note, that styles, classes, attributes and properties that are already set by the component may cause conflicts.

=== "JSX"
	```jsx
	import { Overwrite } from "rvx";

	<Overwrite class="extra-class" on:keydown={...}>
		<SomeComponent />
	</Overwrite>

	function SomeComponent() {
		return <input ... />;
	}
	```

=== "No Build"
	```jsx
	import { e, overwrite } from "./rvx.js";

	overwrite(
		SomeComponent()
	).class("extra-class").on("keydown", ...)

	function SomeComponent() {
		return e("input")...;
	}
	```

## Lifecycle Hooks
[Lifecycle hooks](./lifecycle.md) are supported in components:

=== "JSX"
	```jsx
	import { teardown } from "rvx";

	function Timer() {
		const elapsed = $(0);
		const timer = setInterval(() => { elapsed.value++ }, 1000);
		teardown(() => clearInterval(timer));
		return elapsed;
	}
	```

=== "No Build"
	```jsx
	import { teardown } from "./rvx.js";

	function Timer() {
		const elapsed = $(0);
		const timer = setInterval(() => { elapsed.value++ }, 1000);
		teardown(() => clearInterval(timer));
		return elapsed;
	}
	```
