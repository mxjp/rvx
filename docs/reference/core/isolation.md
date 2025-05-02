# Side Effect Isolation
The [signal](./signals.md) and [lifecycle](./lifecycle.md) APIs can cause side effects such as tracking a signal access or registering a teardown hook.

The `isolate` function can be used to run arbitrary code in isolation from the current context:

=== "JSX"
	```jsx
	import { isolate } from "rvx";

	isolate(() => {
		// Some code with side effects...
	});
	```

=== "No Build"
	```jsx
	import { isolate } from "./rvx.js";

	isolate(() => {
		// Some code with side effects...
	});
	```

## Lifecycle
Teardown hooks are leaked as if [`teardown`](./lifecycle.md#teardown) was called outside of any context:

=== "JSX"
	```jsx
	import { capture, teardown, isolate } from "rvx";

	capture(() => {
		// This will be captured:
		teardown(() => {});

		isolate(() => {
			// This will leak:
			teardown(() => {});
		});
	});
	```

=== "No Build"
	```jsx
	import { capture, teardown, isolate } from "./rvx.js";

	capture(() => {
		// This will be captured:
		teardown(() => {});

		isolate(() => {
			// This will leak:
			teardown(() => {});
		});
	});
	```

To isolate only the lifecycle, you can also use [`uncapture`](./lifecycle.md#uncapture), but this will not trigger [leak detection](../testing.md#leak-detection).

## Signals
Signal accesses are not tracked as if the signal was accessed outside of any observer.

=== "JSX"
	```jsx
	import { effect, isolate, track } from "rvx";

	effect(() => {
		// This is tracked:
		signalA.access();

		isolate(() => {
			// This is ignored:
			signalB.access();

			track(() => {
				// This is also ignored:
				signalC.access();
			});
		});
	});
	```

=== "No Build"
	```jsx
	import { effect, isolate, track } from "./rvx.js";

	effect(() => {
		// This is tracked:
		signalA.access();

		isolate(() => {
			// This is ignored:
			signalB.access();

			track(() => {
				// This is also ignored:
				signalC.access();
			});
		});
	});
	```

To only control if signal accesses are tracked, use [`track` and `untrack`](./signals.md#track--untrack) instead.

## Non Isolated APIs
[Batches](./signals.md#batch) are not isolated as this could lead to inconsistent signal access tracking:

```jsx
import { batch, isolate } from "rvx";

batch(() => {
	// This is part of the batch:
	a.value++;

	isolate(() => {
		// This is also part of the batch:
		b.value++;
	});
});
```

The `isolate` function is transparent to all [contexts](./context.md) for performance reasons:

=== "JSX"
	```jsx
	import { Context, isolate } from "rvx";

	const EXAMPLE = new Context(42);

	EXAMPLE.inject(77, () => {
		isolate(() => {
			EXAMPLE.value; // 77
		});
	});
	```

=== "No Build"
	```jsx
	import { Context, isolate } from "./rvx.js";

	const EXAMPLE = new Context(42);

	EXAMPLE.inject(77, () => {
		isolate(() => {
			EXAMPLE.value; // 77
		});
	});
	```

In case you also need to isolate all contexts, `isolate` can be combined with `Context.window`:

=== "JSX"
	```jsx
	import { Context, isolate } from "rvx";

	isolate(Context.window, [], () => {
		// ...
	});
	```

=== "No Build"
	```jsx
	import { Context, isolate } from "./rvx.js";

	isolate(Context.window, [], () => {
		// ...
	});
	```
