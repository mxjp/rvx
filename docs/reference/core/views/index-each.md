# `<Index> / indexEach`
Render [content](../elements.md#content) for each index in an iterable [expression](../signals.md#expressions).

=== "JSX"
	```jsx
	import { Index } from "rvx";

	<Index each={someIterable}>
		{value => <li>{value}</li>}
	</Index>
	```

=== "No Build"
	```jsx
	import { indexEach, e } from "./rvx.js";

	indexEach(someIterable, value => e("li").append(value))
	```

## Index
The index is passed as the second argument:

=== "JSX"
	```jsx
	<Index each={someIterable}>
		{(value, index) => <li>{index + 1}: {value}</li>}
	</Index>
	```

=== "No Build"
	```jsx
	indexEach(someIterable, (value, index) => e("li").append(index + 1, ": ", value))
	```

## Error Handling
Errors thrown by the component or while updating an index result in undefined behavior.
