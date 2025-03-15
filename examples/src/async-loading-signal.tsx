/*

# Async Loading Signal
This is an example component that displays a loading indicator until it's content is ready.

*/

import { Component, movable } from "rvx";
import { ASYNC, Async, AsyncContext } from "rvx/async";

function WithLoadingSignal(props: {
	children: Component;
}) {
	const ctx = AsyncContext.fork();
	const content = movable(ASYNC.inject(ctx, props.children));
	return <Async source={ctx.complete()} pending={() => <>Loading...</>}>
		{content.move}
	</Async>;
}

export function Example() {
	return <WithLoadingSignal>
		{() => <Async source={new Promise(r => setTimeout(r, 1000))}>
			{() => <>This has been rendered asynchronously.</>}
		</Async>}
	</WithLoadingSignal>;
}
