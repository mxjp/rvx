# Context
Contexts can be used to implicitly pass values along the call stack and other rvx APIs.

=== "JSX"
	```jsx
	import { Context } from "rvx";

	// Create a context:
	const MESSAGE = new Context<string | undefined>();

	// Provide a value for the context while running a function:
	MESSAGE.provide("Hello World!", () => {
		// Access the current value:
		MESSAGE.current; // "Hello World!"
	});
	```

=== "No Build"
	```jsx
	import { Context } from "./rvx.js";

	// Create a context:
	const MESSAGE = new Context();

	// Provide a value for the context while running a function:
	MESSAGE.provide("Hello World!", () => {
		// Access the current value:
		MESSAGE.current; // "Hello World!"
	});
	```

You can also provide values for multiple contexts at once:

=== "JSX"
	```jsx
	import { Context } from "rvx";

	const MESSAGE = new Context<string | undefined>();

	Context.provide([
		MESSAGE.with("Hello World!"),
		OTHER_CONTEXT.with(...),
		...
	], () => {
		MESSAGE.current; // "Hello World!"
	});
	```

=== "No Build"
	```jsx
	import { Context } from "./rvx.js";

	const MESSAGE = new Context();

	Context.provide([
		MESSAGE.with("Hello World!"),
		OTHER_CONTEXT.with(...),
		...
	], () => {
		MESSAGE.current; // "Hello World!"
	});
	```

## Default Values
Contexts have a global default value which is returned if nothing, `null` or `undefined` is provided.

=== "JSX"
	```jsx
	import { Context } from "rvx";

	const CONTEXT = new Context(42);

	CONTEXT.current; // 42

	CONTEXT.provide(77, () => {
		CONTEXT.current; // 77

		CONTEXT.provide(null, () => {
			CONTEXT.current; // 42
		});
	});
	```

=== "No Build"
	```jsx
	import { Context } from "./rvx.js";

	const CONTEXT = new Context(42);

	CONTEXT.current; // 42

	CONTEXT.provide(77, () => {
		CONTEXT.current; // 77

		CONTEXT.provide(null, () => {
			CONTEXT.current; // 42
		});
	});
	```

## Components
When rendering content, you can use the `<Provide>` component with JSX or the functions specified above:

=== "JSX"
	```jsx
	import { Provide, Context } from "rvx";

	const MESSAGE = new Context<string>();

	<Provide context={MESSAGE} value="Hello World!">
		{() => <h1>{MESSAGE.current}</h1>}
	</Provide>

	// Or provide multiple contexts:
	<Provide states={[MESSAGE.with("Hello World!"), ...]}>
		{() => <h1>{MESSAGE.current}</h1>}
	</Provide>
	```

=== "No Build"
	```jsx
	import { Context, e } from "./rvx.js";

	const MESSAGE = new Context();

	MESSAGE.provide("Hello World!", () => {
		return e("h1").append(MESSAGE.current);
	});

	// Or provide multiple contexts:
	Context.provide([MESSAGE.with("Hello World!"), ...], () => {
		return e("h1").append(MESSAGE.current);
	});
	```

## Async Code
Since contexts rely on the synchronous call stack, they don't automatically work with async code:

=== "JSX"
	```jsx
	import { Context } from "rvx";

	const MESSAGE = new Context<string>();

	MESSAGE.provide("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(() => {
			MESSAGE.current; // undefined
		});
	});
	```

=== "No Build"
	```jsx
	import { Context } from "./rvx.js";

	const MESSAGE = new Context();

	MESSAGE.provide("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(() => {
			MESSAGE.current; // undefined
		});
	});
	```

You can bind functions to the current context to fix this:

=== "JSX"
	```jsx
	MESSAGE.provide("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(Context.bind(() => {
			MESSAGE.current; // "Hello World!"
		}));
	});
	```

=== "No Build"
	```jsx
	MESSAGE.provide("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(Context.bind(() => {
			MESSAGE.current; // "Hello World!"
		}));
	});
	```
