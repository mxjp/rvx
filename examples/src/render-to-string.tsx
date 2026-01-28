/*

# Render To String
This example shows how to render a component to HTML using rvx DOM.

*/

import { Async } from "rvx/async";
import { renderToStringAsync } from "rvx/dom";

export function Example() {
	const promise = renderToStringAsync(() => <>
		<h1>Hello World!</h1>
		<Async source={new Promise(r => setTimeout(r, 1000))}>
			{() => <>This has been rendered asynchronously.</>}
		</Async>
	</>);

	return <Async source={promise} pending={() => <>Rendering...</>}>
		{html => <pre><code>{html}</code></pre>}
	</Async>;
}
