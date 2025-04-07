# `<Show> / when`
Render [content](../elements.md#content) when an [expression](../signals.md#expressions) is truthy.

=== "JSX"
	```jsx
	import { Show } from "rvx";

	<Show when={someCondition}>
		{() => <>Hello World!</>}
	</Show>
	```

=== "No Build"
	```jsx
	import { when } from "./rvx.js";

	when(someCondition, () => "Hello World!")
	```

## Truthy Results
Truthy condition results are passed to the child callback as the first argument.

=== "JSX"
	```jsx
	const message = $("Hello World!");

	<Show when={message}>
		{value => <h1>{value}</h1>}
	</Show>
	```

=== "No Build"
	```jsx
	const message = $("Hello World!");

	when(message, value => e("h1").append(value))
	```

## Fallback
A function to render fallback content can be specified as the `else` property.

=== "JSX"
	```jsx
	<Show when={message} else={() => <>No message.</>}>
		{value => <h1>{value}</h1>}
	</Show>
	```

=== "No Build"
	```jsx
	when(message, value => e("h1").append(value), () => "No message.")
	```
