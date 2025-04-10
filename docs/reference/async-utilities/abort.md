# Abort Controllers
Abort controllers can be used in many web APIs to abort things.

The `useAbortController` and `useAbortSignal` functions can be used to abort things when the current [lifecycle](../core/lifecycle.md) is disposed:

=== "JSX"
	```jsx
	import { useAbortSignal } from "rvx/async";

	// Abort a fetch request when disposed:
	fetch("/info.txt", { signal: useAbortSignal() });

	// Remove an event listener when disposed:
	window.addEventListener("keydown", () => { ... }, { signal: useAbortSignal() });
	```

=== "No Build"
	```jsx
	import { useAbortSignal } from "./rvx.async.js";

	// Abort a fetch request when disposed:
	fetch("/info.txt", { signal: useAbortSignal() });

	// Remove an event listener when disposed:
	window.addEventListener("keydown", () => { ... }, { signal: useAbortSignal() });
	```
