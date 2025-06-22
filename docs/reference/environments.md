# Environments
Rvx accesses all browser related APIs through the `ENV` context which provides a `window` like object.
```jsx
import { ENV } from "rvx";

// Set the global default:
ENV.default = someAPI;

// Or use a different DOM API in a specific context:
ENV.inject(someAPI, () => {
	// ...
});

// Access the current DOM API:
ENV.current.document.createElement("div");
```

## Rvx DOM
The `"rvx/dom"` module provides a fast minimal DOM implementation with the single purpose of rendering HTML strings on the server or during a build process.

!!! tip
	A minimal project template for static site generation using rvx dom and vite can be found [here](https://github.com/mxjp/rvx/tree/main/templates/vite-ssg).

The `renderToString` utility can be used to synchronously render a [component](./core/components.md) to HTML:
```jsx
import { renderToString } from "rvx/dom";

const html = renderToString(() => {
	return <h1>Hello World!</h1>;
});

console.log(html); // "<h1>Hello World!</h1>"
```

To wait for [`<Async>`](./async-utilities/async.md) parts to complete, use `renderToStringAsync`:
```jsx
import { renderToStringAsync } from "rvx/dom";

const html = await renderToStringAsync(() => {
	return <Async source={Promise.resolve("Hello World!")}>
		{title => <h1>{title}</h1>}
	</Async>;
});

console.log(html); // "<h1>Hello World!</h1>"
```

The [lifecycle](./core/lifecycle.md) of rendered components is disposed immediately after rendering the HTML string.

!!! warning
	This module is **not** in any way optimized for code size and probably should not be used in a real browser.

!!! danger
	In order to be fast, this implementation skips some validations that a browser would usually perform:

	+ DOM node hierachy is not validated. This can be used to create cyclically nested nodes.
	+ Class list tokens and inline css properties are not validated. This can be used to create invalid `class` or `style` attributes.

### Replacing Pre-Rendered HTML
Rvx does not directly support hydration. Instead, you can render content off screen and replace entire parts of the page when complete:

=== "JSX"
	```jsx
	import { render } from "rvx";

	const app = render(
		<h1>Hello World!</h1>
	);

	// Replace a specific element:
	document.getElementById("app-root").replace(app.detach());

	// Replace the entire page:
	document.body.replaceChildren(app.detach());
	```

=== "No Build"
	```jsx
	import { render, e } from "./rvx.js";

	const app = render(
		e("h1").append("Hello World!"),
	);

	// Replace a specific element:
	document.getElementById("app-root").replace(app.detach());

	// Replace the entire page:
	document.body.replaceChildren(app.detach());
	```

If needed, you can wait for [`<Async>`](./async-utilities/async.md) parts to complete before replacing any elements:

=== "JSX"
	```jsx
	import { render } from "rvx";
	import { ASYNC, Async, AsyncContext } from "rvx/async";

	const asyncCtx = new AsyncContext();
	const app = ASYNC.inject(asyncCtx, () => {
		return render(
			<Async source={Promise.resolve("Hello World!")}>
				{title => <h1>{title}</h1>}
			</Async>
		);
	});

	// Wait for all "<Async>" parts to complete:
	await asyncCtx.complete();

	// Replace the entire page:
	document.body.replaceChildren(app.detach());
	```

=== "No Build"
	```jsx
	import { e, render } from "./rvx.js";
	import { ASYNC, Async, AsyncContext } from "./rvx.async.js";

	const asyncCtx = new AsyncContext();
	const app = ASYNC.inject(asyncCtx, () => {
		return render(
			Async({
				source: Promise.resolve("Hello World!"),
				children: title => e("h1").append(title),
			})
		);
	});

	// Wait for all "<Async>" parts to complete:
	await asyncCtx.complete();

	// Replace the entire page:
	document.body.replaceChildren(app.detach());
	```

### Detecting Rvx DOM
The `isRvxDom` function can be used to detect if rvx dom is enabled in the current context. When using a bundler with tree shaking, this will not include the rvx dom implementation.

=== "JSX"
	```jsx
	import { isRvxDom } from "rvx/dom";

	console.log(isRvxDom());
	```

=== "No Build"
	```jsx
	import { isRvxDom } from "./rvx.dom.js";

	console.log(isRvxDom());
	```

## JSDOM
The [JSDOM](https://www.npmjs.com/package/jsdom) library can emulate a subset of browser APIs in NodeJS and is fully supported as an environment for rvx. This can be used for testing without using a real browser.
```jsx
import { JSDOM } from "jsdom";
import { ENV } from "rvx";

ENV.default = new JSDOM().window;

mount(ENV.current.document.body, <h1>Hello World!</h1>);
```

## Web Components
The `rvx/element` module always uses the global default at module load time. To use it in a non-browser environment, you need to ensure that the global default is set before loading that module:
```jsx
import { ENV } from "rvx";

ENV.default = someAPI;

const { RvxElement } = await import("rvx/element");

class SomeWebComponent extends RvxElement { ... }
```
