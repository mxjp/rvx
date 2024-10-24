# Context
Contexts can be used to implicitly pass static key value pairs along the call stack.

Contexts automatically work with synchronous code & all rvx APIs.

+ The `inject` function runs a callback and provides a single key value pair.
+ The `extract` function gets a value from the current context.

=== "JSX"
	```jsx
	import { inject, extract } from "rvx";

	inject("message", "Hello World!", () => {
		extract("message"); // "Hello World!"
		extract("something else"); // undefined
	});
	```

=== "No Build"
	```jsx
	import { inject, extract } from "./rvx.js";

	inject("message", "Hello World!", () => {
		extract("message"); // "Hello World!"
		extract("something else"); // undefined
	});
	```

To inject multiple keys or to delete keys from a context, use `deriveContext`:

=== "JSX"
	```jsx
	import { deriveContext, extract } from "rvx";

	deriveContext(ctx => {
		ctx.set("message", "Hello World!");
		ctx.delete("something else");

		extract("message"); // "Hello World!"
	});
	```

=== "No Build"
	```jsx
	import { deriveContext, extract } from "./rvx.js";

	deriveContext(ctx => {
		ctx.set("message", "Hello World!");
		ctx.delete("something else");

		extract("message"); // "Hello World!"
	});
	```

## Components
When rendering content, you can use the `<Inject>` and `<DeriveContext>` components with JSX or the functions specified above:

=== "JSX"
	```jsx
	import { Inject, DeriveContext, extract } from "rvx";

	<Inject key="value" value={42}>
		{() => <>Value: {extract("value")}</>}
	</Inject>

	<DeriveContext>
		{ctx => {
			ctx.set("value", 42);
			return <>Value: {extract("value")}</>;
		}}
	</DeriveContext>
	```

=== "No Build"
	```jsx
	import { inject, deriveContext, extract } from "./rvx.js";

	inject("value", 42, () => {
		return ["Value: ", extract("value")];
	})

	deriveContext(ctx => {
		ctx.set("value", 42);
		return ["Value: ", extract("value")];
	})
	```

## Typed Keys
Context values are typed as `unknown` by default.

You can use symbols in combination with the `ContextKey` type as keys:

=== "JSX"
	```jsx
	import { ContextKey, inject, extract } from "rvx";

	const MESSAGE = Symbol("message") as ContextKey<string>;

	inject(MESSAGE, "Hello World!", () => {
		extract(MESSAGE); // Type: string | undefined
	});

	// This is now a compiler error:
	inject(MESSAGE, 42, () => { ... });
	```

=== "No Build"
	```jsx
	import { inject, extract } from "./rvx.js";

	/** @type {import("./rvx.js").ContextKey<string>} */
	const MESSAGE = Symbol("message");

	inject(MESSAGE, "Hello World!", () => {
		extract(MESSAGE); // Type: string | undefined
	});

	// This would now be a compiler error when using ts-check:
	inject(MESSAGE, 42, () => { ... });
	```

## Async Code
Since contexts rely on the synchronous call stack, they only work partially with async code:

=== "JSX"
	```jsx
	import { inject, extract } from "rvx";

	inject("message", "Hello World!", async () => {
		extract("message"); // "Hello World!"
		await something;
		extract("message"); // undefined
	});
	```

=== "No Build"
	```jsx
	import { inject, extract } from "./rvx.js";

	inject("message", "Hello World!", async () => {
		extract("message"); // "Hello World!"
		await something;
		extract("message"); // undefined
	});
	```

You can manually pass contexts to somewhere else to fix this:

=== "JSX"
	```jsx
	import { inject, extract, getContext, runInContext } from "rvx";

	inject("message", "Hello World!", async () => {
		// Get a reference to the current context:
		const context = getContext();

		await something;

		// Run a function within the context from above:
		runInContext(context, () => {
			extract("message"); // "Hello World!"
		});
	});
	```

=== "No Build"
	```jsx
	import { inject, extract, getContext, runInContext } from "./rvx.js";

	inject("message", "Hello World!", async () => {
		// Get a reference to the current context:
		const context = getContext();

		await something;

		// Run a function within the context from above:
		runInContext(context, () => {
			extract("message"); // "Hello World!"
		});
	});
	```

## Troubleshooting

### Context Key Typos
Ensure that the `key` argument is the same everywhere.
```jsx
inject("message", "Hello World!", () => {
	// There is a typo here:
	extract("nessage");
});
```

To avoid this, you can use [typed context keys](#typed-keys):
```jsx
const MESSAGE = Symbol.for("example-message") as ContextKey<string>;

inject(MESSAGE, "Hello World!", () => {
	// This typo is now a compiler error:
	extract(NESSAGE);
});
```

### Extract Running Too Late
`extract` must be called synchronously while the callback passed to `inject` or `deriveContext` is running.
```jsx
inject(MESSAGE, "Hello World!", () => {
	queueMicrotask(() => {
		// This runs after the inject call has already ended:
		extract(MESSAGE); // undefined
	});
});
```

To solve this, you can [forward the context](#async-code) as follows:
```jsx
inject(MESSAGE, "Hello World!", () => {

	// Bind the current context to your callback:
	queueMicrotask(wrapContext(() => {
		extract(MESSAGE); // "Hello World!"
	}));

	// Or manually pass the context to somewhere else:
	const context = getContext();
	queueMicrotask(() => {
		runInContext(context, () => {
			extract(MESSAGE); // "Hello World!"
		});
	});

});
```

### Extract Running Too Early
When using `deriveContext`, the context must be modified before `extract` is called.
```jsx
deriveContext(ctx => {
	// This doesn't work:
	extract(MESSAGE); // undefined

	ctx.set(MESSAGE, "Hello World!");

	// This works:
	extract(MESSAGE); // "Hello World!"
});
```
