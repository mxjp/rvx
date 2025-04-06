# Timers

## `useMicrotask`
The same as `queueMicrotask`, but with lifecycle support.

+ If the current lifecycle is disposed, the callback is never called.
+ The lifecycle within the callback is treated as the current lifecycle.

=== "JSX"
	```jsx
	import { useMicrotask } from "rvx/async";

	useMicrotask(() => { ... });
	```

=== "No Build"
	```jsx
	import { useMicrotask } from "./rvx.js";

	useMicrotask(() => { ... });
	```

## `useTimeout`
The same as `useTimeout`, but with lifecycle support.

+ If the current lifecycle is disposed, the timeout is cleared.
+ The lifecycle within the callback is treated as the current lifecycle.

=== "JSX"
	```jsx
	import { useTimeout } from "rvx/async";

	useTimeout(() => { ... }, 1000);
	```

=== "No Build"
	```jsx
	import { useTimeout } from "./rvx.js";

	useTimeout(() => { ... }, 1000);
	```

## `useInterval`
The same as `setInterval`, but with lifecycle support.

+ If the current lifecycle is disposed, the interval is cleared.
+ The lifecycle within the callback is disposed when the interval is cleared and before each call.

=== "JSX"
	```jsx
	import { useInterval } from "rvx/async";

	useInterval(() => { ... }, 1000);
	```

=== "No Build"
	```jsx
	import { useInterval } from "./rvx.js";

	useInterval(() => { ... }, 1000);
	```
