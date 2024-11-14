# `Queue`
This is a queue for sequentially running async tasks.

Depending on the use case, a task can be either **blocking** or a **side effect**:

+ **Blocking** tasks are queued normally and are guaranteed to run.
+ **Side effects** are queued, but aborted when anything else is queued.

=== "JSX"
	```jsx
	import { Queue } from "rvx/async";

	const queue = new Queue();

	// Queue a blocking task:
	const value = await queue.block(async () => {
		// ...
		return 42;
	});

	// Queue a side effect:
	queue.sideEffect(async signal => {
		// "signal" is an abort signal to abort this side effect if possible.
	});
	```

=== "No Build"
	```jsx
	import { Queue } from "./rvx.js";

	const queue = new Queue();

	// Queue a blocking task:
	const value = await queue.block(async () => {
		// ...
		return 42;
	});

	// Queue a side effect:
	queue.sideEffect(async signal => {
		// "signal" is an abort signal to abort this side effect if possible.
	});
	```

## Error Handling

+ Errors thrown in blocking tasks are thrown by the promise returned by the `block` function.
+ Errors thrown in side effects will cause unhandled rejections but will not affect the queue in any other way.
