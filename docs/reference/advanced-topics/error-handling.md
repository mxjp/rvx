# Error Handling

## Lifecycle Hooks
If an unhandled error occurs in a context where lifecycle hooks are captured, they are immediately called in reverse registration order.

To prevent leaks, teardown hooks should be registered as early as possible. In the example below, resource **b** is cleaned up first, then **a**.
```jsx
capture(() => {
	const a = getSomeResource();
	teardown(() => a.cleanup());

	const b = getSomeResource(a);
	teardown(() => b.cleanup());

	throw new Error();
});
```

The following should be avoided:
```jsx
capture(() => {
	const a = getSomeResource();

	// If this throws an error, "a" is never cleaned up
	// because the teardown hook below is not yet registered.
	const b = getSomeResource(a);

	teardown(() => {
		a.cleanup();
		b.cleanup();
	});
});
```

Lifecycle hooks are automatically captured in:

+ `capture`
+ `captureSelf`
+ `teardownOnError`
+ `watch`
+ `watchUpdates`
+ All render callbacks in rvx's [view implementations](../core/views/index.md#creating-views).

## Render Errors
Rvx has no dedicated error handling while rendering. If something in the synchronous render tree fails, the entire tree will fail to render and lifecycle hooks are called as [specified above](#lifecycle-hooks).

If you need some kind of error boundary, you can use a component like the one below.

=== "JSX"
	```jsx
	import { teardownOnError } from "rvx";

	function TryRender(props: {
		fallback: (error: unknown) => unknown;
		children: () => unknown;
	}) {
		try {
			return teardownOnError(props.children);
		} catch (error) {
			console.error(error);
			return props.fallback(error);
		}
	}

	<TryRender fallback={error => "Something went wrong."}>
		{() => <>
			<SomethingDangerous />
			Hello World!
		</>}
	</TryRender>
	```

=== "No Build"
	```jsx
	import { teardownOnError } from "./rvx.js";

	function TryRender(props: {
		fallback: (error: unknown) => unknown;
		children: () => unknown;
	}) {
		try {
			return teardownOnError(props.children);
		} catch (error) {
			console.error(error);
			return props.fallback(error);
		}
	}

	TryRender({
		fallback: error => "Something went wrong.",
		children: () => [
			SomethingDangerous(),
			"Hello World!",
		]
	})
	```

## Error Codes
To keep the runtime as small as possible, rvx uses the error codes below instead of error messages.

### `G1`
**View boundary was not completely initialized.**

This is thrown when a [`View`](../core/views/index.md#implementing-views) did not complete boundary initialization during it's construction. This is always a bug in the view implementation and the author of that view should ensure, that all the view implementation requirements are met.

The stack trace will point to the place where the wrongly implemented view was instantiated, but the actual problem originates from within that view's implementation.

### `G2`
**View already has a boundary owner.**

[`Views`](../core/views/index.md#view-api) can only have one boundary owner at a time. This error is thrown when a previous owner wasn't disposed correctly or when the view is used in multiple places at once.

### `G3`
**Router is not available in the current context.**

This is thrown by the [`<Routes>`](../routing.md) component if no router has been provided via the current [`context`](../core/context.md).

### `G4`
**`onLeak` must only be called once and outside of any capture calls.**

[Leak detection](../testing.md#leak-detection) is meant for testing purposes. You need to ensure that `onLeak` is only called once per thread and before anything else is initialized.
