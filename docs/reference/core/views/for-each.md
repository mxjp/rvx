# `<For> / forEach`
Render [content](../elements.md#content) for each value in an iterable [expression](../signals.md#expressions) keyed by value.

=== "JSX"
	```jsx
	import { For } from "rvx";

	<For each={someIterable}>
		{value => <li>{value}</li>}
	</For>
	```

=== "No Build"
	```jsx
	import { forEach, e } from "./rvx.js";

	forEach(someIterable, value => e("li").append(value))
	```

## Index
A function to reactively access the current index is passed as the second argument:

=== "JSX"
	```jsx
	<For each={someIterable}>
		{(value, index) => <li>{() => index() + 1}: {value}</li>}
	</For>
	```

=== "No Build"
	```jsx
	forEach(someIterable, (value, index) => e("li").append(() => index() + 1, ": ", value))
	```

## Error Handling
Errors thrown by the component or while updating an index result in undefined behavior.
