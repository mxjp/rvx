/*

# Render To String (Rvx DOM)
This example shows how to render a component to HTML using rvx DOM.

*/

import { Async } from "rvx/async";
import { renderToStringAsync } from "rvx/dom";

export function Example() {
	return <Async
		source={renderToStringAsync(() => <>
			<h1>Hello World!</h1>

			{/* The "renderToString" function will wait for this part: */}
			<Async source={new Promise(r => setTimeout(r, 2000))}>
				{() => <>This has been rendered asynchronously.</>}
			</Async>
		</>)}
		pending={() => <>Rendering...</>}
	>
		{html => <pre><code>{html}</code></pre>}
	</Async>;
}
