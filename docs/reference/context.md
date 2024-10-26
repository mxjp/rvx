# Context
Contexts can be used to implicitly pass values along the call stack and other rvx APIs.

=== "JSX"
	```jsx
	import { Context } from "rvx";

	// Create a context:
	const MESSAGE = new Context<string>();

	// Inject a value for the context while running a function:
	MESSAGE.inject("Hello World!", () => {
		// Access the current value:
		MESSAGE.current; // "Hello World!"
	});
	```

=== "No Build"
	```jsx
	import { Context } from "./rvx.js";

	// Create a context:
	const MESSAGE = new Context();

	// Inject a value for the context while running a function:
	MESSAGE.inject("Hello World!", () => {
		// Access the current value:
		MESSAGE.current; // "Hello World!"
	});
	```

You can also inject values for multiple contexts at once:

=== "JSX"
	```jsx
	import { Context } from "rvx";

	const MESSAGE = new Context<string>();

	Context.inject([
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

	Context.inject([
		MESSAGE.with("Hello World!"),
		OTHER_CONTEXT.with(...),
		...
	], () => {
		MESSAGE.current; // "Hello World!"
	});
	```

## Components
When rendering content, you can use the `<Inject>` component with JSX or the functions specified above:

=== "JSX"
	```jsx
	import { Inject, Context } from "rvx";

	const MESSAGE = new Context<string>();

	<Inject context={MESSAGE} value="Hello World!">
		{() => <h1>{MESSAGE.current}</h1>}
	</Inject>

	// Or inject multiple contexts:
	<Inject states={[MESSAGE.with("Hello World!"), ...]}>
		{() => <h1>{MESSAGE.current}</h1>}
	</Inject>
	```

=== "No Build"
	```jsx
	import { Context, e } from "./rvx.js";

	const MESSAGE = new Context();

	MESSAGE.inject("Hello World!", () => {
		return e("h1").append(MESSAGE.current);
	});

	Context.inject([MESSAGE.with("Hello World!"), ...], () => {
		return e("h1").append(MESSAGE.current);
	});
	```

## Async Code
Since contexts rely on the synchronous call stack, they don't automatically work with async code:

=== "JSX"
	```jsx
	import { Context } from "rvx";

	const MESSAGE = new Context<string>();

	MESSAGE.inject("Hello World!", () => {
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

	MESSAGE.inject("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(() => {
			MESSAGE.current; // undefined
		});
	});
	```

You can wrap functions to always be called in the current context to fix this manually:

=== "JSX"
	```jsx
	MESSAGE.inject("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(Context.wrap(() => {
			MESSAGE.current; // "Hello World!"
		}));
	});
	```

=== "No Build"
	```jsx
	MESSAGE.inject("Hello World!", () => {
		MESSAGE.current; // "Hello World!"
		queueMicrotask(Context.wrap(() => {
			MESSAGE.current; // "Hello World!"
		}));
	});
	```
