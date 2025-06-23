# Testing
Testing rvx based applications is usually very simple because all of it's signal based rendering is synchronous. E.g. when updating a signal, all resulting changes are reflected in the DOM immediately:

=== "JSX"
	```jsx
	import { $ } from "rvx";

	const count = $(7);
	const element = <div>Current count: {count}</div> as HTMLDivElement;
	assert(element.innerText === "Current count: 7");
	count.value = 42;
	assert(element.innerText === "Current count: 42");
	```

=== "No Build"
	```jsx
	import { $, e } from "./rvx.js";

	const count = $(7);
	const element = e("div").append("Current count: ", count).elem;
	assert(element.innerText === "Current count: 7");
	count.value = 42;
	assert(element.innerText === "Current count: 42");
	```

Note, that the `assert` function used on this page is not included in rvx.

## Synchronous Tests
Rvx provides a lightweight wrapper for running small synchronous tests that takes care of calling [teardown hooks](./core/lifecycle.md) after the test.

=== "JSX"
	```jsx
	import { $ } from "rvx";
	import { runTest, querySelector } from "rvx/test";

	runTest(() => {
		const count = $(0);
		const view = mount(
			document.body,
			<button on:click={() => { count.value++; }}>Click me!</button>,
		);
		querySelector(view, "button")?.click();
		assert(count.value === 1);
	});
	```

=== "No Build"
	```jsx
	import { $ } from "./rvx.js";
	import { runTest, querySelector } from "./rvx.test.js";

	runTest(() => {
		const count = $(0);
		const view = mount(
			document.body,
			e("button").on("click", () => { count.value++; }).append("Click me!"),
		);
		querySelector(view, "button")?.click();
		assert(count.value === 1);
	});
	```

## Asynchronous Tests
There is a wrapper for async tests that allows you to run small synchronous parts of your test with a shared [async context](./async-utilities/async.md#tracking-completion). After the test, this will run [teardown hooks](./core/lifecycle.md) registered during any **"use(..)"** calls and wait for any pending tasks tracked in the async context.

The example below shows a test that asserts that asynchronously loaded content is displayed correctly:

=== "JSX"
	```jsx
	import { mount } from "rvx";
	import { Async } from "rvx/async";
	import { runAsyncTest, querySelector } from "rvx/test";

	await runAsyncTest(async ({ asyncCtx, use }) => {
		const view = use(() => {
			return mount(
				document.body,
				<Async source={async () => {
					await something();
					return "Hello World!";
				}}>
					{content => <div class="page">
						{content}
					</div>}
				</Async>
			);
		});

		// Wait for the "<Async>" component to resolve:
		await asyncCtx.complete();

		const page = querySelector<HTMLElement>(view, ".page");
		assert(page !== null);
		assert(page.innerText === "Hello World!");
	});
	```

=== "No Build"
	```jsx
	import { e, mount } from "./rvx.js";
	import { Async } from "./rvx.async.js";
	import { runAsyncTest, querySelector } from "./rvx.test.js";

	await runAsyncTest(async ({ asyncCtx, use }) => {
		const view = use(() => {
			return mount(
				document.body,
				Async({
					source: async () => {
						await something();
						return "Hello World!";
					},
					children: content => e("div").set("class", "page").append(content),
				}),
			);
		});

		// Wait for the "<Async>" component to resolve:
		await asyncCtx.complete();

		const page = querySelector<HTMLElement>(view, ".page");
		assert(page !== null);
		assert(page.innerText === "Hello World!");
	});
	```

## Waiting For Expressions
You can watch arbitrary [expressions](./core/signals.md#expressions) using the `watchFor` function.

=== "JSX"
	```jsx
	import { $ } from "rvx";
	import { watchFor, isPending } from "rvx/async";

	// Wait for a specific signal value:
	const count = $(0);
	setInterval(() => { count.value++ }, 1000);
	await watchFor(() => count.value > 7);

	// Wait with a timeout:
	await watchFor(() => count.value > 7, 500);

	// Wait for pending user tasks:
	await watchFor(() => !isPending());
	```

=== "No Build"
	```jsx
	import { $ } from "./rvx.js";
	import { watchFor, isPending } from "./rvx.async.js";

	// Wait for a specific signal value:
	const count = $(0);
	setInterval(() => { count.value++ }, 1000);
	await watchFor(() => count.value > 7);

	// Wait with a timeout:
	await watchFor(() => count.value > 7, 500);

	// Wait for pending user tasks:
	await watchFor(() => !isPending());
	```

## Polling
You can poll arbitrary functions for the first truthy result using the `poll` function.

=== "JSX"
	```jsx
	import { poll } from "rvx/test";

	// Poll a synchronous function:
	const heading = await poll(() => document.querySelector("h1"));
	console.log(heading.textContent);

	// Poll with a timeout:
	await poll(() => { ... }, 100);

	// Poll an async function:
	await poll(async abortSignal => { ... });
	```

=== "No Build"
	```jsx
	import { poll } from "./rvx.test.js";

	// Poll a synchronous function:
	const heading = await poll(() => document.querySelector("h1"));
	console.log(heading.textContent);

	// Poll with a timeout:
	await poll(() => { ... }, 100);

	// Poll an async function:
	await poll(async abortSignal => { ... });
	```

!!! warning
	+ Avoid overly expensive computations in the callback as it runs every event cycle.
	+ Without a timeout, `poll` might run forever.

## Leak Detection
The [lifecycle API](./core/lifecycle.md) silently discards teardown hooks outside of `capture` calls. This can be a valid use case, for instance when rendering your application until the browser closes or when intentionally leaking teardown hooks using `uncapture`.

However, this can result in accidental memory leaks when registering teardown hooks in async code:
```jsx
const stop = capture(async () => {
	await something();
	const interval = setInterval(() => console.log("ping!"), 1000);
	// "clearInterval" will never be called:
	teardown(() => clearInterval(interval));
});

stop();
```

To catch these cases, you can use the `onLeak` function once before running all of your tests:

=== "JSX"
	```jsx
	import { onLeak } from "rvx";

	onLeak(hook => {
		// "hook" is the teardown hook that is being registered.
		console.trace("Leaked teardown hook:", hook);

		// Or throw an error from within the **teardown** call:
		throw new Error("Teardown hook was not captured.");
	});

	// This will now call the code above:
	teardown(() => {});

	// This will NOT call the code above, as using **uncapture** is very likely intentional:
	uncapture(() => teardown(() => {}));
	```

=== "No Build"
	```jsx
	import { onLeak } from "./rvx.js";

	onLeak(hook => {
		// "hook" is the teardown hook that is being registered.
		console.trace("Leaked teardown hook:", hook);

		// Or throw an error from within the **teardown** call:
		throw new Error("Teardown hook was not captured.");
	});

	// This will now call the code above:
	teardown(() => {});

	// This will NOT call the code above, as using **uncapture** is very likely intentional:
	uncapture(() => teardown(() => {}));
	```

## Concurrency
It is generally possible to run tests for rvx based applications concurrently. However, using APIs that may interfere with each other such as `Element.focus` can result in flaky tests. To solve this you can use the `exclusive` function to run code in a globally shared queue for a specific purpose:

=== "JSX"
	```jsx
	import { runAsyncTest, exclusive } from "rvx/test";

	const FOCUS_ACTIONS = Symbol("focus actions");

	await exclusive(FOCUS_ACTIONS, async () => {
		someInput.focus();
		await somethingElse();
		assert(document.activeElement === someInput);
	});
	```

=== "No Build"
	```jsx
	import { runAsyncTest, exclusive } from "./rvx.test.js";

	const FOCUS_ACTIONS = Symbol("focus actions");

	await exclusive(FOCUS_ACTIONS, async () => {
		someInput.focus();
		await somethingElse();
		assert(document.activeElement === someInput);
	});
	```

Using symbols as keys that are in some common place in your test setup is recommended as it prevents any typos in the key, but you can also use anything alse that can be a `Map` key.
