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

## Update Order
For every update, this view runs a simple diffing algorithm between existing instances and new values at the same index.

The following describes the order in which new instances are created, updated or disposed. Any changes to the update order are considered breaking changes.

+ For each new value, index:
	+ If the existing instance at the current index has a different value, the instance is disposed and a new one is created.
+ Remaining instances are disposed in iteration order.

When the view itself is disposed, instances are disposed in the latest iteration order.

## Error Handling
If an error is thrown by iterating or by rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.

### Performance
The current implementation has a performance of `O(n)` with `n` being the new number of items. When items are frequently moved, consider using [`<For> / forEach`](./for-each.md) instead.
