# Lifecycle
Teardown hooks allow you to run cleanup code when the lifecycle of something is disposed.

The lifecycle of any synchronous code can be manually managed using [`capture`](#capture), [`captureSelf`](#capture) and [`teardownOnError`](#teardownonerror).

To run code after something has been created, you can use [`useMicrotask`](../async-utilities/timers.md#usemicrotask) or manually schedule a microtask.

## `teardown`
Register a hook to be called when the current lifecycle is disposed:

=== "JSX"
	```jsx
	import { teardown } from "rvx";

	const handle = setInterval(() => console.log("ping"), 1000);

	teardown(() => {
		clearInterval(handle);
	});
	```

=== "No Build"
	```jsx
	import { teardown } from "./rvx.js";

	const handle = setInterval(() => console.log("ping"), 1000);

	teardown(() => {
		clearInterval(handle);
	});
	```

Calling `teardown` outside of any functions listed below has no effect and "leaks" the teardown hook. When running tests, this behavior can be [configured](../testing.md#leak-detection) to log leaks or to throw an error.

Teardown hooks run [isolated](./isolation.md) from signal access tracking and the current lifecycle.

## `capture`
Capture teardown hooks during a function call:

=== "JSX"
	```jsx
	import { capture, teardown } from "rvx";

	const dispose = capture(() => {
		teardown(() => { ... });
	});

	dispose();
	```

=== "No Build"
	```jsx
	import { capture, teardown } from "./rvx.js";

	const dispose = capture(() => {
		teardown(() => { ... });
	});

	dispose();
	```

Teardown hooks are called in reverse registration order when the returned `dispose` function is called.

If the specified function throws an error, teardown hooks are called in reverse registration order and the error is re-thrown.

## `captureSelf`
This is almost the same as `capture` and is meant for things that need to dispose themselves.

=== "JSX"
	```jsx
	import { captureSelf, teardown } from "rvx";

	captureSelf(dispose => {
		teardown(() => { ... });

		dispose();
	});
	```

=== "No Build"
	```jsx
	import { captureSelf, teardown } from "./rvx.js";

	captureSelf(dispose => {
		teardown(() => { ... });

		dispose();
	});
	```

Teardown hooks are called in reverse registration order when the `dispose` function is called.

When `dispose` is called while the callback is still running, it has no effect and will call teardown hooks immediately after the callback completes instead.

If the specified function throws an error, teardown hooks are called in reverse registration order and the error is re-thrown.

## `uncapture`
To explicitly leak teardown hooks, the `uncapture` function can be used. Code running during the call has an infinitly long lifecycle.

=== "JSX"
	```jsx
	import { uncapture } from "rvx";

	uncapture(() => {
		// This has no effect here:
		teardown(() => { ... });
	});
	```

=== "No Build"
	```jsx
	import { uncapture } from "./rvx.js";

	uncapture(() => {
		// This has no effect here:
		teardown(() => { ... });
	});
	```

## `teardownOnError`
Run a function and immediately call teardown hooks if it throws an error.

+ If an error is thrown, teardown hooks are immediately called in reverse registration order and the error is re-thrown.
+ If no error is thrown, this behaves as if teardown hooks were registered in the outer context.

=== "JSX"
	```jsx
	import { teardownOnError } from "rvx";

	teardownOnError(() => {
		teardown(() => doSomeCleanup());
		throw new Error("something went wrong");
	});
	```

=== "No Build"
	```jsx
	import { teardownOnError } from "./rvx.js";

	teardownOnError(() => {
		teardown(() => doSomeCleanup());
		throw new Error("something went wrong");
	});
	```

## Nesting
Any lifecycle related API calls can be arbitrarily nested.

=== "JSX"
	```jsx
	import { capture, uncapture, teardown } from "rvx";

	uncapture(() => {
		const dispose = capture(() => {
			teardown(() => {
				...
			});
		});

		dispose();
	});
	```

=== "No Build"
	```jsx
	import { capture, uncapture, teardown } from "./rvx.js";

	uncapture(() => {
		const dispose = capture(() => {
			teardown(() => {
				...
			});
		});

		dispose();
	});
	```

## Repetitive Disposal
By default, teardown hooks can be called multiple times and primitives like [`capture`](#capture) and [`captureSelf`](#captureself) don't provide any logic for preventing multiple calls.

```jsx
const dispose = capture(() => {
	teardown(() => {
		console.log("teardown");
	});
});

// This will call all registered hooks twice:
dispose();
dispose();
```

In general, teardown hooks should never cause any unintended behavior just because they are called multiple times. Preventing something from being called multiple times must be implemented manually.

## Async Code
Capturing teardown hooks relies on the synchronous call stack and therefore only works partially with async code:
```jsx
const dispose = capture(async () => {
	// This will be captured:
	teardown(() => { ... });

	await something;

	// This will be leaked:
	teardown(() => { ... });
});
```

In a test or development environment, you can configure [how leaked teardown hooks behave](../testing.md#leak-detection).

To dispose things that are initialized later, you manually need to capture it's teardown hooks:
```jsx
const dispose = capture(async () => {
	let disposed = false;
	let disposeLater: TeardownHook | undefined;

	teardown(() => {
		disposed = true;
		disposeLater?.();
	});

	await something;

	if (!disposed) {
		disposeLater = capture(() => {
			// Register some teardown hooks here...
		});
	}
});
```
