# Store
The store API provides a way to create deep reactive wrappers for arbitrary objects.

The `wrap` function creates a deep reactive wrapper:

=== "JSX"
	```jsx
	import { wrap } from "rvx/store";

	const state = wrap({
		message: "Hello World!",
	});

	<h1>{() => state.message}</h1>
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js";
	import { wrap } from "./rvx.store.js";

	const state = wrap({
		message: "Hello World!",
	});

	e("h1").append(() => state.message)
	```

By default, objects with the following exact prototypes are wrapped:

| Prototype | Wrapped using |
|-|-|
| `Object.prototype` | `createReactiveProxy` |
| `Array.prototype` | `createReactiveArrayProxy` |
| `Map.prototype` | `new ReactiveMap` |
| `Set.prototype` | `new ReactiveSet` |

## Updates
To update a reactive object, you can directly modify the wrapper.

=== "JSX"
	```jsx
	import { wrap } from "rvx/store";

	const todos = wrap([
		{ name: "Foo", done: false },
		{ name: "Bar", done: false },
	]);

	todos[1].done = true;
	todos.push({ name: "Baz", done: true });
	```

=== "No Build"
	```jsx
	import { wrap } from "./rvx.store.js";

	const todos = wrap([
		{ name: "Foo", done: false },
		{ name: "Bar", done: false },
	]);

	todos[1].done = true;
	todos.push({ name: "Baz", done: true });
	```

Note, that every individual update is processed immediately. To prevent this, you can use [batches](./core/signals.md#batch):

=== "JSX"
	```jsx
	import { batch } from "rvx";

	batch(() => {
		todos[1].done = true;
		todos.push({ name: "Baz", done: true });
	});
	```

=== "No Build"
	```jsx
	import { batch } from "./rvx.js";

	batch(() => {
		todos[1].done = true;
		todos.push({ name: "Baz", done: true });
	});
	```

## Signal Reflection
The `reflect` utility can be used to create a [signal](./core/signals.md) that reflects a reactive property of an arbitrary object.

=== "JSX"
	```jsx
	import { reflect, wrap } from "rvx/store";

	const item = wrap({ name: "Foo", done: false });

	const done = reflect(item, "done");
	```

=== "No Build"
	```jsx
	import { reflect, wrap } from "./rvx.store.js";

	const item = wrap({ name: "Foo", done: false });

	const done = reflect(item, "done");
	```

The target object doens't need to be a reactive wrapper. Any arbitrary object with reactive properties works.

## Classes
By default, arbitrary class instances are not reactive unless you specify, how to wrap them:

=== "JSX"
	```jsx
	import { wrapInstancesOf } from "rvx/store";

	class Example {
		static {
			// Wrap instances of "Example" in the same way, objects are wrapped:
			wrapInstancesOf(this);

			// Or implement custom behavior:
			wrapInstancesOf(this, target => {
				return new Proxy(target, ...);
			});
		}
	}
	```

=== "No Build"
	```jsx
	import { wrapInstancesOf } from "./rvx.store.js";

	class Example {
		static {
			// Wrap instances of "Example" in the same way, objects are wrapped:
			wrapInstancesOf(this);

			// Or implement custom behavior:
			wrapInstancesOf(this, target => {
				return new Proxy(target, ...);
			});
		}
	}
	```

### Private Fields
Private fields are not reactive. Also, you need to ensure they are accessed through the original object instead of reactive wrappers by using `unwrap`.

=== "JSX"
	```jsx
	import { wrapInstancesOf, wrap, unwrap } from "rvx/store";

	class Example {
		static {
			wrapInstancesOf(this);
		}

		#count = 0;

		thisWorks() {
			// "unwrap" always returns the original object
			// or the value itself if it isn't a wrapper:
			unwrap(this).#count++;
		}

		thisFails() {
			// This will fail, since "this" refers to the
			// reactive wrapper instead of the original object:
			this.#count++;
		}
	}

	const example = wrap(new Example());
	example.thisWorks();
	example.thisFails();
	```

=== "No Build"
	```jsx
	import { wrapInstancesOf, wrap, unwrap } from "./rvx.store.js";

	class Example {
		static {
			wrapInstancesOf(this);
		}

		#count = 0;

		thisWorks() {
			// "unwrap" always returns the original object
			// or the value itself if it isn't a wrapper:
			unwrap(this).#count++;
		}

		thisFails() {
			// This will fail, since "this" refers to the
			// reactive wrapper instead of the original object:
			this.#count++;
		}
	}

	const example = wrap(new Example());
	example.thisWorks();
	example.thisFails();
	```
