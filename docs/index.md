---
title: Overview
hide:
  - navigation
  - toc
---

# ![rvx](./assets/banner.svg)

Rvx is a signal based frontent framework.

```jsx
import { $, mount } from "rvx";

const count = $(0);

mount(
	document.body,
	<button on:click={() => { count.value++ }}>
		Clicked {count} times
	</button>
);
```

<br>

<div class="grid cards" markdown>

- ### Precise API
	Rvx's API is designed to closely represent what happens internally to avoid hidden complexity. Exact behavior and possible edge cases are subject to semantic versioning.

- ### Lightweight
	The entire core module has a size of about 4KB when minified & gzipped and almost everything is treeshakeable.

- ### No Build System Required
	Rvx doesn't require a build system at all.
	```jsx
	mount(
		document.body,
		e("h1").append("Hello World!"),
	);
	```

- ### TypeScript & JSX
	You can opt in to using TypeScript or any standard JSX transpiler.
	```jsx
	mount(
		document.body,
		<h1>Hello World!</h1>
	);
	```

- ### Side Effect Separation
	Reactive expressions can be separated from side effects to reduce the risk of accidental infinite loops.
	```jsx
	watch(count, value => {
		console.log(value);
	});
	```

- ### Synchronous Rendering
	Signal updates are processed synchronously for permanent consistency between state & UI.
	```jsx
	message.value = "Hello World!";

	element.textContent;
	// => "Hello World!"
	```

- ### Low Level
	Element expressions always create real DOM elements which is plenty fast.
	```jsx
	<input /> instanceof HTMLInputElement;
	```

	Conditional or repeated content is represented as sequences of DOM nodes that change over time.
	```jsx
	<Show when={greet}>
		{() => <h1>Hello World!</h1>}
	</Show>
	```

- ### Strongly Typed Reactivity
	When using TypeScript, the reactivity of component properties is encoded in the type system.
	```jsx
	function TextInput(props: {
		// Static:
		type: "text" | "password";
		// Reactive input:
		disabled: Expression<boolean>;
		// Reactive in & output:
		value: Signal<string>;
	}) ...
	```

</div>
