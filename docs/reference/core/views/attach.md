# `<Attach> / attachWhen`
Attach [content](../elements.md#content) when an [expression](../signals.md#expressions) is truthy.

=== "JSX"
	```jsx
	import { Attach } from "rvx";

	<Attach when={someCondition}>
		Hello World!
	</Attach>
	```

=== "No Build"
	```jsx
	import { attachWhen } from "./rvx.js";

	attachWhen(someCondition, "Hello World!")
	```

!!! note
	This view has no effect on the context or lifecycle of it's content.

	If you need access to truthy condition results, use [`<Show>`](./show.md) instead.
