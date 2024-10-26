# Tasks
The task system keeps track of pending tasks in a specific context. This is meant primarily for preventing user interaction while some operation is running.

=== "JSX"
	```jsx
	import { Inject } from "rvx";
	import { TASKS, Tasks, isPending, waitFor } from "rvx/async";

	<Inject context={TASKS} value={new Tasks()}>
		{() => <>
			<button
				// Disable this button when there are any pending tasks:
				disabled={isPending}
				on:click={() => {
					// Block user interactions while some operation is running:
					waitFor(new Promise(resolve => {
						setTimeout(resolve, 1000);
					}));
				}}
			>Click me!</button>
		</>}
	</Inject>
	```

=== "No Build"
	```jsx
	import { TASKS, Tasks, isPending, waitFor } from "./rvx.js";

	TASKS.inject(new Tasks(), () => [
		e("button")
			// Disable this button when there are any pending tasks:
			.set("disabled", isPending)
			.on("click", () => {
				// Block user interactions while some operation is running:
				waitFor(new Promise(resolve => {
					setTimeout(resolve, 1000);
				}));
			})
			.append("Click me!"),
	])
	```

## Parent Tasks
`Tasks` instances can have a parent which is meant for separating contexts like the content of dialogs and popovers:

=== "JSX"
	```jsx
	function SomePopoverComponent(props: { children: () => unknown; }) {
		return <Inject context={TASKS} value={Tasks.fork()}>
			<props.children />
		</Inject>;
	}
	```

=== "No Build"
	```jsx
	/**
	 * @param {object} props
	 * @param {() => unknown} props.children
	 */
	function SomePopoverComponent(props) {
		return TASKS.inject(Tasks.fork(), props.children);
	}
	```

+ The child context is also considered pending if the parent has any pending tasks.
+ The parent tasks instance is unaffected by it's children.
+ `Tasks.fork` is a shorthand for `new Tasks(TASKS.current)`.

## Error Handling
Any errors thrown by tasks will result in unhandled rejections but will not affect the task system in any other way.
