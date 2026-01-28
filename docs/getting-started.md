# Getting Started

!!! info
	This framework assumes that you have a good fundamental understanding of JavaScript and HTML. If not, [MDN](https://developer.mozilla.org/docs/Web/JavaScript) is a good place to start.

To develop an rvx application locally, you need a recent version of [NodeJS](https://nodejs.org/) or any other compatible JavaScript runtime.

You can use the commands below to setup a minimal rvx project using [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/) or [Webpack](https://webpack.js.org/):

=== "Vite"
	```bash
	# Create a "my-app" directory from rvx's "vite" template project:
	npx degit mxjp/rvx/templates/vite my-app

	# Move into "my-app":
	cd my-app

	# Install dependencies:
	npm install

	# Start a development server:
	npm start
	```

=== "Webpack"
	```bash
	# Create a "my-app" directory from rvx's "webpack" template project:
	npx degit mxjp/rvx/templates/webpack my-app

	# Move into "my-app":
	cd my-app

	# Install dependencies:
	npm install

	# Start a development server:
	npm start
	```

## Entry Point
After setting up the quick start template, you can find the main entry point in `src/main.tsx`:
```jsx
import { mount } from "rvx";

mount(
	document.body,
	<h1>Hello World!</h1>
);
```
The `<h1>Hello World!</h1>` expression directly creates an element and the `mount` function takes whatever content is supported by rvx and appends it to the specified element.

## State & Reactivity
Reactivity is entirely based on signals which are objects that hold an arbitrary value:
```jsx
import { $ } from "rvx";

// Create a signal with the initial value 0:
const count = $(0);
```

When a signal is used directly or it's value is accessed through a function call, the signal can notify it's observers when the value changes:
```jsx
import { $, mount } from "rvx";

const count = $(0);

mount(
	document.body,
	<>
		{/* Using the signal directly is reactive: */}
		Current count: {count}

		{/* Accessing it's value through a function is reactive: */}
		Is even count: {() => (count.value & 1) === 0}

		{/*
			Using the value directly is not reactive because
			rvx has no way of re-evaluating the expression:
		*/}
		Initial count: {count.value}
	</>
);
```

To replace a signal value, you can set the `value` property:
```jsx
count.value = 1;
```

To update an object, you can use the `update` function.
```jsx
const values = $([7, 42]);

// This will modify the inner value and then notify observers:
values.update(values => {
	values.push(77);
});

// Note, that deeply modifying objects directly does nothing:
values.value.push(77);
```

## Basic Rendering
JSX expressions directly create HTML elements:
```jsx
<button>Click me!</button>
```

By default, attribute names are the same as in HTML:
```jsx
<img alt="An image" src="..." />
```

Attributes, set to `false`, `undefined` or `null` are removed. `true` is set as an empty string:
```jsx
<input disabled={false} /> // <input>
<input disabled={true} /> // <input disabled="">
```

Attributes prefixed with `prop:` are set using JavaScript properties:
```jsx
<input type="text" prop:value="Hello World!" />
```

Signals or functions used as attribute values are reactive:
```jsx
<input type="number" prop:value={count}>
<input type="number" prop:value={() => count.value}>
```

## Event Listeners
Attributes prefixed with `on:` are added as event listeners.
```jsx
<button on:click={event => {
	console.log("Clicked", event.target);
}}>Click me!</button>
```

## Conditional Rendering
To render conditional or repeated content rvx uses so called **Views** which are sequences of DOM nodes that can change over time.

The `Show` component renders content when a condition is met:
```jsx
import { $, mount, Show } from "rvx";

const showMessage = $(false);

mount(
	document.body,
	<>
		<button on:click={() => { showMessage.value = !showMessage.value }}>
			Toggle message
		</button>

		<Show when={showMessage}>
			{() => <h1>Hello World!</h1>}
		</Show>
	</>
);
```

The `For` component repeats content for each unique item in an iterable:
```jsx
import { $, mount, For } from "rvx";

const values = $<number[]>([]);

mount(
	document.body,
	<>
		<button on:click={() => { values.update(v => v.push(Date.now())) }}>
			Add current time
		</button>

		<ul>
			<For each={values}>
				{value => <li>{value}</li>}
			</For>
		</ul>
	</>
);
```

In addition to `Show` and `For`, rvx provides some more view types you can find [here](./reference/core/views/index.md) or you can implement your own views for special use cases.

## Components
Components in rvx are just functions that return arbitrary content. They are called once when the component is rendered.
```jsx
function Message() {
	return <h1>Hello World!</h1>;
}

// Using the component:
<Message />;
```

Properties are passed as is via the `props` argument and are static by default.
```jsx
function Message(props: { message: string; }) {
	return <h1>{props.message}</h1>;
}

// Using the component:
<Message message="Hello World!" />;
```

To make properties reactive, you can use the `Expression` type which can be a static value, a signal or a function:
```jsx
import { Expression } from "rvx";

function Message(props: { message: Expression<string>; }) {
	return <h1>{props.message}</h1>;
}

// Using the component:
<Message message="Hello World!" />;
<Message message={() => "Hello World!"} />;
<Message message={someSignal} />;
```

To compute something from an expression or to evaluate it, you can use the `map` and `get` functions:
```jsx
import { Expression, map, get } from "rvx";

function Message(props: { message: Expression<string>; }) {
	// "get" reactively returns the current value of an expression:
	console.log("Initial message:", get(props.message));

	// "map" applies a function to the expression result:
	return <h1>{map(props.message, m => m.toUpperCase())}</h1>;
}
```

To allow components to update a value, you can use the `Signal` type:
```jsx
import { $, mount, Signal } from "rvx";

function TextInput(props: { value: Signal<string>; }) {
	return <input
		type="text"
		prop:value={props.value}
		on:input={event => {
			props.value.value = (event.target as HTMLInputElement).value;
		}}
	/>;
}

const text = $("Hello World!");
<TextInput value={text} />;
```

Component children are passed via the `children` property:
```jsx
function Message(props: { children?: unknown; }) {
	return <h1>{props.children}</h1>;
}

<Message>Hello World!</Message>;
```

## Moving on...
From here, you can take a look at [the reference](./reference/index.md) or [the examples](./examples/stopwatch.md) to get a brief overview.

To develop a deep understanding of rvx, you should read through the core reference in the order below:

+ [Lifecycle](./reference/core/lifecycle.md) / [Context](./reference/core/context.md)
+ [Signals](./reference/core/signals.md)
+ [Elements](./reference/core/elements.md)
+ [Views](./reference/core/views/index.md)
+ [Components](./reference/core/components.md)
