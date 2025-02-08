# Routing
Routers provide a reactive path and query parameters and allow navigating in their current context.

You can either implement your own router using the `Router` interface or use one of the provided implementations:

+ `HistoryRouter` - Uses the location and history API for navigation.
+ `HashRouter` - Uses the location hash.
+ `MemoryRouter` - Keeps it's state in memory instead of the actual browser location. This can be useful for testing purposes.

=== "JSX"
	```jsx
	import { Inject } from "rvx";
	import { ROUTER, HistoryRouter } from "rvx/router";

	<Inject context={ROUTER} value={new HistoryRouter()}>
		{() => <>
			Everything in here has access to the history router.
		</>}
	</Inject>
	```

=== "No Build"
	```jsx
	import { ROUTER, HistoryRouter } from "./rvx.js";

	ROUTER.inject(new HistoryRouter(), () => [
		"Everything in here has access to the history router."
	])
	```

The `Routes` component can be used to render content based on the current path.

=== "JSX"
	```jsx
	import { Inject } from "rvx";
	import { ROUTER, HistoryRouter, Routes } from "rvx/router";

	<Inject context={ROUTER} value={new HistoryRouter()}>
		{() => <>
			<Routes routes={[
				{ match: "/", content: () => "Home" },
				{ match: "/foo", content: ExamplePage },
				{ content: () => "Not found" },
			]} />
		</>}
	</Inject>

	function ExamplePage() {
		return <>Example</>;
	}
	```

=== "No Build"
	```jsx
	import { ROUTER, HistoryRouter, routes } from "./rvx.js";

	ROUTER.inject(new HistoryRouter(), () => [
		routes([
			{ match: "/", content: () => "Home" },
			{ match: "/foo", content: ExamplePage },
			{ content: () => "Not found" },
		]),
	])

	function ExamplePage() {
		return "Example";
	}
	```

## Route Matching
Routes are matched against the [normalized](#path-normalization) path in the order in which they are specified.

Strings match exactly that path and all sub paths if they end with a slash:

```jsx
[
	// Matches only "/foo":
	{ match: "/foo", ... },
	// Matches "/foo", "/foo/bar" etc.
	{ match: "/foo/", ... },
]
```

Regular expressions are tested against the [normalized](#path-normalization) path:
```jsx
[
	// Matches only "/foo":
	{ match: /^\/foo$/, ... },

	// Matches "/user/123":
	{
		match: /^\/user\/(\d+)$/,
		content: ({ params }) => {
			// The match is passed via the "params" property:
			return <>User id: {params[1]}</>;
		},
	},
]
```

Rvx itself doesn't provide any custom syntax for dynamic routes, but you can use a package like [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) if you need to:
```jsx
import { pathToRegexp } from "path-to-regexp";

[
	{ match: pathToRegexp("/user/:id"), ... }
]
```

Functions can return an object with the normalized matched path and optional parameters to indicate a match:

=== "JSX"
	```jsx
	import { normalize } from "rvx/router";

	[
		{
			match: path => {
				if (/\/foo(\/|$)/.test(path)) {
					return {
						path: normalize(path.slice(4)),
						params: 42,
					};
				}
			},
			content: ({ params }) => {
				return <>{params}</>;
			},
		}
	]
	```

=== "No Build"
	```jsx
	import { normalize } from "./rvx.js";

	[
		{
			match: path => {
				if (/\/foo(\/|$)/.test(path)) {
					return {
						path: normalize(path.slice(4)),
						params: 42,
					};
				}
			},
			content: ({ params }) => {
				return <>{params}</>;
			},
		}
	]
	```

## Path Normalization
Paths are normalized, so that non-empty paths always start with a slash and the root path is represented as an empty string.

Below are some examples:

=== "JSX"
	```jsx
	import { normalize } from "rvx/router";

	normalize("") // ""
	normalize("/") // ""
	normalize("foo") // "/foo"
	normalize("/foo") // "/foo"
	normalize("/foo/") // "/foo/"

	// Trailing slashes can be discarded:
	normalize("/foo/", false) // "/foo"
	```

=== "No Build"
	```jsx
	import { normalize } from "./rvx.js";

	normalize("") // ""
	normalize("/") // ""
	normalize("foo") // "/foo"
	normalize("/foo") // "/foo"
	normalize("/foo/") // "/foo/"

	// Trailing slashes can be discarded:
	normalize("/foo/", false) // "/foo"
	```

## Navigation
The router in the current context can be used for navigation.

Routers implement a **push** function for regular navigation and a **replace** function for replacing the current path if possible.

=== "JSX"
	```jsx
	import { ROUTER } from "rvx/router";

	function ExamplePage() {
		const router = ROUTER.current!.root;
		return <button on:click={() => {
			router.push("/some-path");
		}}>Navigate</button>;
	}
	```

=== "No Build"
	```jsx
	import { ROUTER, e } from "./rvx.js";

	function ExamplePage() {
		const router = ROUTER.current.root;
		return e("button").on("click", () => {
			router.push("/some-path");
		}).append("Navigate");
	}
	```

Note, that the router instance is replaced with a [child router](#nested-routing) inside of routed content. In this case, the **root** property always provides access to the history router from above.

## Nested Routing
Routes can be arbitrarily nested with content in between.

The example below renders text for the paths `/, /foo/bar, /foo/baz`:

=== "JSX"
	```jsx
	import { Inject } from "rvx";
	import { ROUTER, HistoryRouter, Routes } from "rvx/router";

	<Inject context={ROUTER} value={new HistoryRouter()}>
		{() => <>
			<Routes routes={[
				{ match: "/", content: () => "Home" },
				{ match: "/foo/", content: () => {

					// This is a ChildRouter:
					ROUTER.current;

					return <Routes routes={[
						{ match: "/bar", content: () => "Bar" },
						{ match: "/baz", content: () => "Baz" },
					]} />;
				} },
			]} />
		</>}
	</Inject>
	```

=== "No Build"
	```jsx
	import { ROUTER, HistoryRouter, routes } from "./rvx.js";

	ROUTER.inject(new HistoryRouter(), () => [
		routes([
			{ match: "/", content: () => "Home" },
			{ match: "/foo/", content: () => {

				// This is a ChildRouter:
				ROUTER.current;

				return routes([
					{ match: "/bar", content: () => "Bar" },
					{ match: "/baz", content: () => "Baz" },
				]);
			} },
		]),
	])
	```

The router instance is replaced with a [child router](#nested-routing) inside of routed content which only exposes the unmatched rest path and navigates within the matched path. In the example above, the **innerRouter** navigates within **/foo**:
```jsx
// Navigates to /foo/bar:
innerRouter.push("/bar");

// To navigate globally, use the root router instead:
innerRouter.root.push("/foo/bar");
```

## Query Parameters
Query parameters can be reactively accessed via router instances.

=== "JSX"
	```jsx
	// Access the raw query string (without the leading "?"):
	ROUTER.current!.query?.raw;

	// Access the query as a URLSearchParams object:
	ROUTER.current!.query?.params;
	```

=== "No Build"
	```jsx
	// Access the raw query string (without the leading "?"):
	ROUTER.current.query?.raw;

	// Access the query as a URLSearchParams object:
	ROUTER.current.query?.params;
	```

Note, that the `query` property is undefined if the current URL doesn't contain a query.

## Async Content
You can use the [`<Async>`](./async-utilities/async.md) component to dynamically import & render components.

=== "JSX"
	```jsx
	// example-page.tsx:
	export default function() {
		return <>Hello World!</>;
	}

	// main.tsx:
	import { Routes } from "rvx/router";
	import { Async } from "rvx/async";

	<Routes routes={[
		{
			match: "/",
			content: () => <Async source={() => import("./example-page")}>
				{pageModule => <pageModule.default />}
			</Async>
		},
	]} />
	```

=== "No Build"
	```jsx
	// example-page.js:
	export default function() {
		return "Hello World!";
	}

	// main.js:
	import { routes, Async } from "./rvx.js";

	routes([
		{
			match: "/",
			content: () => Async({
				source: () => import("./example-page"),
				children: pageModule => pageModule.default(),
			})
		},
	])
	```

Depending on how you want to implement things like error handling and loading indicators, you can build a small function like this:

=== "JSX"
	```jsx
	function page(importModule: () => Promise<{ default: () => unknown }>) {
		return () => <Async source={importModule}
			pending={() => <>Loading...</>}
			rejected={error => <>Error: {error}</>}
		>
			{pageModule => <pageModule.default />}
		</Async>;
	}

	<Routes routes={[
		{ match: "/", content: page(() => import("./home")) },
		{ match: "/example", content: page(() => import("./example")) },
	]} />
	```

=== "No Build"
	```jsx
	/**
	 * @param {() => Promise<{ default: () => unknown }>} importModule
	 */
	function page(importModule) {
		return () => Async({
			source: importModule,
			pending: () => "Loading...",
			rejected: error => ["Error: ", error],
			children: pageModule => pageModule.default(),
		});
	}

	routes([
		{ match: "/", content: page(() => import("./home")) },
		{ match: "/example", content: page(() => import("./example")) },
	])
	```
