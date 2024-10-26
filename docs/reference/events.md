# Event System
A tiny synchronous event system separate from DOM events.

=== "JSX"
	```jsx
	import { Emitter } from "rvx/event";

	const emitter = new Emitter<[address: string, port: number]>();

	// Subscribe until the current lifecycle is disposed:
	emitter.event((address, port) => {
		console.log("Connected:", address, port);
	});

	// Synchronously call listeners in subscription order:
	emitter.emit("127.0.0.1", 12345);
	```

=== "No Build"
	```jsx
	import { Emitter } from "./rvx.js";

	/** @type {Emitter<[address: string, port: number]>} */
	const emitter = new Emitter();

	// Subscribe until the current lifecycle is disposed:
	emitter.event((address, port) => {
		console.log("Connected:", address, port);
	});

	// Synchronously call listeners in subscription order:
	emitter.emit("127.0.0.1", 12345);
	```

## Context Separation

!!! warning
	Event listeners are in no way separated from the context where the event is emitted in.

### Lifecycle
Event listeners running while capturing [teardown hooks](./lifecycle.md#capture) will be able to register hooks in that lifecycle:

=== "JSX"
	```jsx
	import { capture } from "rvx";
	import { Emitter } from "rvx/event";

	const emitter = new Emitter<[]>();

	emitter.event(() => {
		teardown(() => { ... });
	});

	capture(() => {
		emitter.emit();
	});
	```

=== "No Build"
	```jsx
	import { capture, Emitter } from "./rvx.js";

	const emitter = new Emitter();

	emitter.event(() => {
		teardown(() => { ... });
	});

	capture(() => {
		emitter.emit();
	});
	```

To prevent listeners from registering teardown hooks, use [`nocapture`](./lifecycle.md#nocapture):
```jsx
nocapture(() => emitter.emit());
```

### Signal Accesses
Event listeners running while signal accesses are tracked will be able to access additional signals:

=== "JSX"
	```jsx
	import { effect } from "rvx";
	import { Emitter } from "rvx/event";

	const emitter = new Emitter<[]>();
	const signal = sig(42);

	emitter.event(() => {
		// This access is tracked inside the effect below:
		console.log("Value:", signal.value);
	});

	effect(() => {
		emitter.emit();
	});
	```

=== "No Build"
	```jsx
	import { effect, Emitter } from "./rvx.js";

	const emitter = new Emitter();
	const signal = sig(42);

	emitter.event(() => {
		// This access is tracked inside the effect below:
		console.log("Value:", signal.value);
	});

	effect(() => {
		emitter.emit();
	});
	```

To prevent this, you can use [`untrack`](./signals.md#track-untrack):
```jsx
untrack(() => emitter.emit());
```

Note, that this can still be circumvented by event listeners using [`track`](./signals.md#track-untrack).

### Contexts
Event listeners running while a value for a context is injected also have access to that value.

=== "JSX"
	```jsx
	import { Context } from "rvx";
	import { Emitter } from "rvx/event";

	const MESSAGE = new Context<string>();

	const emitter = new Emitter<[]>();
	emitter.event(() => {
		MESSAGE.current; // "Hello World!"
	});

	MESSAGE.inject("Hello World!", () => {
		emitter.emit();
	});
	```

=== "No Build"
	```jsx
	import { Context, Emitter } from "./rvx.js";

	const MESSAGE = new Context();

	const emitter = new Emitter();
	emitter.event(() => {
		MESSAGE.current; // "Hello World!"
	});

	MESSAGE.inject("Hello World!", () => {
		emitter.emit();
	});
	```

You can prevent listeners from accessing any current values from the emitter side:
```jsx
Context.window([], () => emitter.emit());
```

You can wrap event listeners to always run with the current values:
```jsx
emitter.event(Context.wrap(() => { ... }));
```

## Error Handling
The event system has no dedicated error handling. Any errors thrown from listeners will prevent further listeners from running.

## Components
To allow components to listen to events, it's enough to pass the `event` as a property:

=== "JSX"
	```jsx
	import { Event, Emitter } from "rvx/event";

	function SomeComponent(props: { onMessage: Event<[message: string]> }) {
		props.onMessage(message => {
			console.log(message);
		});
	}

	const messages = new Emitter<[message: string]>();

	<SomeComponent onMessage={messages.event} />
	```

=== "No Build"
	```jsx
	import { Emitter } from "./rvx.js";

	/**
	 * @param {object} props
	 * @param {import("./rvx.js").Event<[message: string]>} props.onMessage
	 */
	function SomeComponent(props) {
		props.onMessage(message => {
			console.log(message);
		});
	}

	const messages = new Emitter();

	SomeComponent({ onMessage: messages.event })
	```

To allow components to also emit events, pass the emitter instead.
