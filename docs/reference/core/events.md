# Event System
A tiny synchronous event system separate from DOM events.

=== "JSX"
	```jsx
	import { Emitter } from "rvx";

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

## Isolation
Event listeners are not [isolated](./isolation.md) from the current context in any way. E.g. they will be able to register teardown hooks or signal accesses etc.

## Error Handling
The event system has no dedicated error handling. Any errors thrown from listeners will prevent further listeners from running.

## Components
To allow components to listen to events, it's enough to pass the `event` as a property:

=== "JSX"
	```jsx
	import { Event, Emitter } from "rvx";

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
	 * @param {import("./rvx.event.js").Event<[message: string]>} props.onMessage
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
