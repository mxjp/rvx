# Tasks
The task system keeps track of pending tasks in a specific context. This is meant primarily for preventing user interaction while some operation is running.

=== "JSX"
	```jsx
	import { Provide } from "rvx";
	import { TASKS, Tasks, isPending } from "rvx/async";

	<Provide context={TASKS} value={new Tasks()}>
		{() => <>
			<button
				// Disable this button when there are any pending tasks:
				disabled={isPending}
				on:click={() => {
					// Block user interactions while some operation is running:
					TAKS.current!.waitFor(new Promise(resolve => {
						setTimeout(resolve, 1000);
					}));
				}}
			>Click me!</button>
		</>}
	</Provide>
	```

=== "No Build"
	```jsx
	import { TASKS, Tasks, isPending } from "./rvx.async.js";

	TASKS.provide(new Tasks(), () => [
		e("button")
			// Disable this button when there are any pending tasks:
			.set("disabled", isPending)
			.on("click", () => {
				// Block user interactions while some operation is running:
				TASKS.current.waitFor(new Promise(resolve => {
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
		return <Provide context={TASKS} value={Tasks.fork()}>
			<props.children />
		</Provide>;
	}
	```

=== "No Build"
	```jsx
	/**
	 * @param {object} props
	 * @param {() => unknown} props.children
	 */
	function SomePopoverComponent(props) {
		return TASKS.provide(Tasks.fork(), props.children);
	}
	```

+ The child context is also considered pending if the parent has any pending tasks.
+ The parent tasks instance is unaffected by its children.
+ `Tasks.fork` is a shorthand for `new Tasks(TASKS.current)`.

## Error Handling
Any errors thrown by tasks will result in unhandled rejections but will not affect the task system in any other way.
