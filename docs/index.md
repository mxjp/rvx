---
title: Overview
hide:
  - navigation
  - toc
---

![](./assets/banner.svg)

# rvx!
This is a signal based frontend framework.

=== "JSX"
	```jsx
	import { mount, sig } from "rvx";

	const count = sig(0);

	mount(
		document.body,
		<button on:click={() => { count.value++ }}>
			Clicked {count} times
		</button>
	);
	```

=== "No Build"
	```jsx
	import { mount, sig, e } from "./rvx.js";

	const count = sig(0);

	mount(
		document.body,
		e("button").on("click", () => { count.value++ }).append(
			"Clicked ", count, " times",
		),
	);
	```

## Stability
This is an early in-development version with [frequent breaking changes](https://github.com/mxjp/rvx/blob/main/CHANGELOG.md)

## Goals & Motivation

### Precise API
Rvx tries to be as transparent as possible about it's exact behavior and possible edge cases to avoid any hidden complexity. Instead of trying to look like react, the API is designed to closely represent what happens internally.

### Low Level
In rvx, you directly create real DOM elements which is relatively fast and has a low memory footprint compared to virtual DOMs. For rendering conditional or repeated nodes, rvx uses so called Views which are just sequences of nodes that can change themselves over time.

??? note "Example"
	```jsx
	<input /> instanceof HTMLInputElement; // true
	```

	```jsx
	<Show when={someCondition}>
		{() => <h1>Hello World!</h1>}
	</Show>
	```

### Composability
Everything in rvx is composable without any restrictions. You can define reactive state anywhere you like and use it anywhere else, dynamically define and pass around components, etc.

??? note "Example"
	Using state from somewhere else:
	```jsx
	const count = sig(0);

	function GlobalCounter() {
		return <button on:click={() => { count.value++ }}>
			Clicked {count} times
		</button>
	}

	<GlobalCounter />
	<GlobalCounter />
	```

	Dynamically defining a component:
	```jsx
	function createHeadingComponent(level: number) {
		const TagName = `h${level}`;
		return (props: { children?: unknown }) => {
			return <TagName>{props.children}</TagName>;
		};
	}

	const H2 = createHeadingComponent(2);

	<H2>Level 2 heading</H2>
	```

### No/Minimal Build System
Rvx doesn't require a build system. You can choose between an element builder API, any standard JSX transpiler or both if you need to.

??? note "Example"
	Without any build system, a minimal application can look like this:
	```jsx
	import { mount, e } from "./rvx.js";

	mount(
		document.body,
		e("h1").append("Hello World!"),
	);
	```

	When using typescript, you only need two additional lines of configuration to use fully functional JSX:
	```jsx
	{
		"compilerOptions": {
			"jsx": "react-jsx",
			"jsxImportSource": "rvx"
		}
	}
	```

### Lightweight
The entire rvx core module has a size of about 4 to 5KB when minified & gzipped and almost everything is tree-shakeable, so you only pay for what you need.

### Strongly Typed Reactivity
When using rvx with TypeScript, the fact which component properties may be reactive is [encoded in the type system](./reference/components.md#expressions). This allows developers to know what to expect of a component and eliminates weird caveats when accessing properties from a component's props argument.

??? note "Example"
	For some properties like the level of a heading component, it doesn't make sense to change the level over time:
	```jsx
	function Heading(props: { level: number, children?: unknown }) { ... }

	// This works:
	<Heading level={1}>...</Heading>

	// Using something reactive results in a compiler error:
	<Heading level={() => 1}>...</Heading>
	```

	You can declare, that something may change by using the `Expression` type:
	```jsx
	function ElapsedTime(props: { elapsed: Expression<number> }) { ... }

	// This works:
	<ElapsedTime elapsed={42} />
	<ElapsedTime elapsed={() => 42} />
	<ElapsedTime elapsed={someSignal} />
	```

	Component props can be destructured in any way without breaking reactivity:
	```jsx
	function ElapsedTime(props: { elapsed: Expression<number> }) {
		// This is still reactive:
		const elapsed = props.elapsed;
		return <>Elapsed time: {() => Math.floor(get(elapsed))}</>;
	}
	```

### Immediate Updates
Signal updates are processed immediately. This ensures that your application state stays consistent & predictable at any time.

??? note "Example"
	```jsx
	const message = sig("");
	const elem = <h1>{message}</h1> as HTMLElement;

	message.value = "Hello World!";
	elem.textContent; // "Hello World!"
	```

	Immediate side effects run synchronously in sequence:
	```jsx
	const count = sig(0);
	effect(() => {
		console.group("Current:", count.value);
		if (count.value < 2) {
			count.value++;
			console.log("New:", count.value);
		}
		console.groupEnd();
	});
	console.log("Final:", count.value);
	```
	```
	Current: 0
	  New: 1
	Current: 1
	  New: 2
	Current: 2
	Final: 2
	```

### Side Effect Separation
Reactive expressions can be separated from their side effects. This reduces the risk of accidental infinite loops known from other signal based systems.

??? note "Example"
	The code below shows how many times a checkbox has been checked using the `watch` primitive:
	```jsx
	const checked = sig(false);
	const count = sig(0);

	watch(checked, value => {
		if (value) {
			count.value++;
		}
	});

	<>
		<SomeCheckbox checked={checked} />
		Checked {count} times.
	</>
	```

	In contrast, the code below would create an infinite loop because `count` is also accessed to increment it:
	```jsx
	effect(() => {
		if (checked.value) {
			count.value++;
		}
	});
	```



## Features
Rvx supports all the client side features you would expect from a modern framework including:

+ [Rendering SVG & MathML elements](./reference/elements.md#namespaces)
+ [Manually watching for state changes](./reference/signals.md#watch)
+ [Memoized computations](./reference/signals.md#memo)
+ [Two way data binding via mapped signals](./reference/components.md#signals)
+ [Portaling elements](./reference/views/render.md#portalling)
+ [Conditional rendering](./reference/views/index.md)
+ [Custom rendering logic](./reference/views/index.md#creating-views)
+ [Lifecycle hooks](./reference/lifecycle.md#teardown)
+ [Components](./reference/components.md)
+ [Contexts](./reference/context.md)
+ [Update batching](./reference/signals.md#batch)
+ [Using and authoring web components](./reference/web-components.md)
+ [Global state management](./reference/store.md) with deep reactive wrappers for
	+ Arrays
	+ Objects & class instances
	+ Sets
	+ Maps
+ [History API & hash based routing](./reference/routing.md)
	+ Custom & manual route matching
	+ Nested routing

### Hydration Unsupport
Rvx does not directly support server side rendering (SSR) or hydration and probably never will. Instead, you can use libraries like [JSDOM](https://www.npmjs.com/package/jsdom) to render rvx applications on the server or during the build process.

On the client, rvx provides a way to [render](./examples/render-to-string.md) an entire application in the background, wait for all async parts to complete and then replace pre-rendered DOM. This approach temporarily uses more memory than hydration, but has approximately the same performance, makes client side code much more simpler and removes the need to explicitly support SSR and hydration in your application code.
