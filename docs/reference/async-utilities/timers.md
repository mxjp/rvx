# Timers

## `useMicrotask`
The same as `queueMicrotask`, but with context & lifecycle support.

+ If the current lifecycle is disposed, the callback is never called.
+ The lifecycle within the callback is treated as the current lifecycle.
+ The current context is available inside the callback.

=== "JSX"
	```jsx
	import { useMicrotask } from "rvx/async";

	useMicrotask(() => { ... });
	```

=== "No Build"
	```jsx
	import { useMicrotask } from "./rvx.async.js";

	useMicrotask(() => { ... });
	```

## `useTimeout`
The same as `useTimeout`, but with context & lifecycle support.

+ If the current lifecycle is disposed, the timeout is cleared.
+ The lifecycle within the callback is treated as the current lifecycle.
+ The current context is available inside the callback.

=== "JSX"
	```jsx
	import { useTimeout } from "rvx/async";

	useTimeout(() => { ... }, 1000);
	```

=== "No Build"
	```jsx
	import { useTimeout } from "./rvx.async.js";

	useTimeout(() => { ... }, 1000);
	```

## `useInterval`
The same as `setInterval`, but with context & lifecycle support.

+ If the current lifecycle is disposed, the interval is cleared.
+ The lifecycle within the callback is disposed when the interval is cleared and before each call.
+ The current context is available inside the callback.

=== "JSX"
	```jsx
	import { useInterval } from "rvx/async";

	useInterval(() => { ... }, 1000);
	```

=== "No Build"
	```jsx
	import { useInterval } from "./rvx.async.js";

	useInterval(() => { ... }, 1000);
	```

## `useAnimation`
Repeatedly request animation frames using `requestAnimationFrame`.

+ If the current lifecycle is disposed, the latest request is cancelled.
+ The lifecycle within the callback is disposed before each call and when the current lifecycle is disposed.
+ The current context is available inside the callback.

=== "JSX"
	```jsx
	import { useAnimation } from "rvx/async";

	useAnimation(() => { ... });
	```
