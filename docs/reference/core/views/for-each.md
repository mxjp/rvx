# `<For> / forEach`
Render [content](../elements.md#content) for each entry in an iterable [expression](../signals.md#expressions).

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

## Keys
By default, entries are keyed by value.

You can specify a function to get a custom key for a given value:

=== "JSX"
	```jsx
	<For each={someMap} key={entry => `${entry[0]}/${entry[1]}`}>
		{entry => <li>{entry[0]} = {entry[1]}</li>}
	</For>
	```

=== "No Build"
	```jsx
	forEach(someMap, entry => e("li").append(entry[0], " = ", entry[1]), entry => `${entry[0]}/${entry[1]}`)
	```

Note that updates to anything other than the computed key are ignored.

## Error Handling
Errors thrown by the component or while updating an index result in undefined behavior.
