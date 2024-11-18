/*

# Render To String (Manual)
This example shows how to manually render a component to HTML using the browser's DOM implementation.

*/

import { Component, Inject, capture } from "rvx";
import { ASYNC, Async, AsyncContext } from "rvx/async";

async function renderToStringAsync(component: Component): Promise<string> {
	// Create context for tracking "<Async>" parts:
	const context = new AsyncContext();

	let host!: Element;
	const dispose = capture(() => {
		// Create a host element to render the component into:
		host = <div>
			<Inject context={ASYNC} value={context}>
				{component}
			</Inject>
		</div> as Element;
	});

	try {
		// Wait for all "<Async>" parts to complete:
		await context.complete();

		// Capture the current HTML:
		return host.innerHTML;
	} finally {
		// Dispose any resources:
		dispose();
	}
}

export function Example() {
	const promise = renderToStringAsync(() => <>
		<h1>Hello World!</h1>

		{/* The "renderToString" function will wait for this part: */}
		<Async source={new Promise(r => setTimeout(r, 1000))}>
			{() => <>This has been rendered asynchronously.</>}
		</Async>
	</>);

	return <Async source={promise} pending={() => <>Rendering...</>}>
		{html => <pre><code>{html}</code></pre>}
	</Async>;
}
