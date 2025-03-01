# Async Loading Signal
A component that displays a loading signal until it's content is ready.

=== "JSX"
	```jsx
	import { Component, movable } from "rvx";
	import { ASYNC, Async, AsyncContext } from "rvx/async";

	function WithLoadingSignal(props: {
		children?: Component;
	}) {
		const ctx = AsyncContext.fork();
		const content = movable(ASYNC.inject(ctx, props.children));
		return <Async source={ctx.complete()} pending={() => <>Loading...</>}>
			{content.move}
		</Async>;
	}
	```

=== "No Build"
	```js
	import { movable, nestAsync, ASYNC, AsyncContext } from "./rvx.js";

	/**
	 * @param {() => unknown} children
	 */
	function withLoadingSignal(children) {
		const ctx = AsyncContext.fork();
		const content = movable(ASYNC.inject(ctx, children));
		return nestAsync(ctx.complete(), content.move, () => "Loading...");
	}
	```

## Example Usage

=== "JSX"
	```jsx
	<WithLoadingSignal>
		{() => <>
			<Async source={fetchText("example.txt")}>
				{content => <pre>{content}</pre>}
			</Async>
		</>}
	</WithLoadingSignal>
	```

=== "No Build"
	```js
	withLoadingSignal(() => {
		return nestAsync(
			fetchText("example.txt"),
			content => e("pre").append(content),
		);
	})
	```
