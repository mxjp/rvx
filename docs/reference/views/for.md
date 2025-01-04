# `<For>`
Render [content](../elements.md#content) for each unique value in an iterable [expression](../signals.md#expressions).

=== "JSX"
	```jsx
	import { For } from "rvx";

	<For each={someIterable}>
		{value => <li>{value}</li>}
	</For>
	```

=== "No Build"
	```jsx
	import { For, e } from "./rvx.js";

	For({
		each: someIterable,
		children: value => e("li").append(value),
	})
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
	For({
		each: someIterable,
		children: (value, index) => e("li").append(() => index() + 1, ": ", value),
	})
	```

## Update Order
For every update, this view runs a simple diffing algorithm between existing instances and new unique values.

The following describes the order in which new instances are created, updated or disposed. Any changes to the update order are considered breaking changes.

+ For each new unique value:
	+ Existing instances are moved to the current index.
	+ A new instance is created if there is none.
+ Remaining non-reused instances are disposed in creation order.

When the view itself is disposed, instances are disposed in the latest iteration order.

## Error Handling
If an error is thrown by iterating or by rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.

### Performance
The current implementation has a best case performance of `O(n)` and a practical worst case performance of `O(n * log(n))` with `n` being the new number of items. In practice, this is mostly irrelevant because the majority of time is spent updating the DOM.
