# Context Events
Allow different parts to listen to & emit events depending on the current context.

=== "JSX"
	```jsx
	import { Context } from "rvx";
	import { Emitter } from "rvx/event";

	const EXAMPLE = new Context(new Emitter<[string]>());

	// Listen for messages:
	EXAMPLE.current.event(message => {
		console.log(message);
	});

	// Send a message from somewhere else:
	EXAMPLE.current.emit("Hello World!");
	```

=== "No Build"
	```js
	import { Context } from "rvx";
	import { Emitter } from "rvx/event";

	/** @type {Context<Emitter<[string]>>} */
	const EXAMPLE = new Context(new Emitter());

	// Listen for messages:
	EXAMPLE.current.event(message => {
		console.log(message);
	});

	// Send a message from somewhere else:
	EXAMPLE.current.emit("Hello World!");
	```
