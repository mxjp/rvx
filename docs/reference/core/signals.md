# Signals
In rvx, a `Signal` is an object which holds an arbitrary value and keeps track of things that have accessed that value.

To create a signal, you can use the `Signal` constructor or the `$` shorthand:

=== "JSX"
	```jsx
	import { $, Signal } from "rvx";

	// using the constructor:
	const count = new Signal(42);
	// or using the shorthand:
	const count = $(42);
	```

=== "No Build"
	```jsx
	import { $, Signal } from "./rvx.js";

	// using the constructor:
	const count = new Signal(42);
	// or using the shorthand:
	const count = $(42);
	```

The current value can be accessed or updated using the `value` property:
```jsx
count.value++;
```

To deeply change a value and then notify the signal observers, use the `update` function:
```jsx
const items = $(["a", "b"]);

items.update(items => {
	items.push("c");
});
```

Signals can also be controlled manually:
```jsx
// Pretend that count was accessed:
count.access();

// Pretend that count has changed:
count.notify();
```

## Equality
By default, setting a signal's `value` property only notifies it's observers if the value is not the same.
```jsx
const count = $(42);
// This does nothing since the value is already 42:
count.value = 42;
```

## Expressions
In rvx, an `Expression` can be a static value, a signal or a function that accesses signals.
```jsx
// A static value:
42;
// A signal itself:
$(42);
// A function that accesses signals:
() => a.value * b.value;
```

## `watch`
Watch an expression until the current lifecycle is disposed.

=== "JSX"
	```jsx
	import { watch } from "rvx";

	watch(count, value => {
		console.log("Count:", value);
	});
	```

=== "No Build"
	```jsx
	import { watch } from "./rvx.js";

	watch(count, value => {
		console.log("Count:", value);
	});
	```

+ The current [context](context.md) is available in both the expression and effect.
+ Evaluation is stopped when the current [lifecycle](lifecycle.md) is disposed.
+ Teardown hooks are called before a signal update is processed or when the current [lifecycle](lifecycle.md) is disposed.

The second effect parameter can be omitted if you want or need to run side effects inside the expression:

=== "JSX"
	```jsx
	import { watch, get } from "rvx";

	watch(() => {
		console.log("Count:", get(count));
	});
	```

=== "No Build"
	```jsx
	import { watch, get } from "./rvx.js";

	watch(() => {
		console.log("Count:", get(count));
	});
	```

!!! tip
	You can use [`untrack`](#track--untrack) to ignore specific signal accesses or [`isolate`](isolation.md) all side effects of arbitrary code.

## `watchUpdates`
This is the same as [`watch`](#watch), but the initial value is returned instead of being passed to the effect.

=== "JSX"
	```jsx
	import { watchUpdates } from "rvx";

	const initialCount = watchUpdates(count, value => {
		console.log("Count:", value);
	});
	```

=== "No Build"
	```jsx
	import { watchUpdates } from "./rvx.js";

	const initialCount = watchUpdates(count, value => {
		console.log("Count:", value);
	});
	```

## `batch`
Signal updates are always processed immediately. The `batch` function can be used to deduplicate and defer updates until the batch callback finishes:

=== "JSX"
	```jsx
	import { batch } from "rvx";

	const a = $(1);
	const b = $(2);

	batch(() => {
		a.value++;
		b.value++;
	});
	```

=== "No Build"
	```jsx
	import { batch } from "./rvx.js";

	const a = $(1);
	const b = $(2);

	batch(() => {
		a.value++;
		b.value++;
	});
	```

If updates from a batch cause immediate recursive side effects, these are also processed as part of the batch.

## `memo`
Run a function and re-run when any accessed signals are updated.

This is the same as [`watch`](#watch) except that it returns a function to reactively access the latest expression result.

=== "JSX"
	```jsx
	import { memo } from "rvx";

	const getValue = memo(() => a.value * b.value);
	```

=== "No Build"
	```jsx
	import { memo } from "./rvx.js";

	const getValue = memo(() => a.value * b.value);
	```

+ The current [context](context.md) is available in the expression.
+ Execution is stopped when the current [lifecycle](lifecycle.md) is disposed.
+ Teardown hooks from the callback are called when the current [lifecycle](lifecycle.md) is disposed or before the next call.

## `track` & `untrack`
Signal accesses are tracked in expressions by default. You can use `untrack` to disable tracking during a function call or `track` to restore the default.

=== "JSX"
	```jsx
	import { track, untrack } from "rvx";

	watch(() => a.value * untrack(() => b.value), () => { ... });
	```

=== "No Build"
	```jsx
	import { track, untrack } from "./rvx.js";

	watch(() => a.value * untrack(() => b.value), () => { ... });
	```

## `get`
Manually evaluate an expression of an unknown type.

=== "JSX"
	```jsx
	import { get } from "rvx";

	get(42); // 42
	get(() => 42); // 42
	get($(42)); // 42
	```

=== "No Build"
	```jsx
	import { get } from "./rvx.js";

	get(42); // 42
	get(() => 42); // 42
	get($(42)); // 42
	```

## `map`
Map an expression value while preserving if the expression is static or not.

=== "JSX"
	```jsx
	import { map } from "rvx";

	// This immediately computes the value:
	map(6, value => value * 7);

	// This returns a function to compute the value:
	map($(6), value => value * 7);
	```

=== "No Build"
	```jsx
	import { map } from "./rvx.js";

	// This immediately computes the value:
	map(6, value => value * 7);

	// This returns a function to compute the value:
	map($(6), value => value * 7);
	```

## `trigger`
Create an expression evaluator pipe that calls a function once when any accessed signals from the latest evaluated expression are updated.

When the lifecycle at which the pipe was created is disposed, the callback function will not be called anymore.

=== "JSX"
	```jsx
	import { $, trigger } from "rvx";

	// Create a new pipe that is bound to the current lifecycle:
	const pipe = trigger(() => {
		console.log("Signal has been updated.");
	});

	const signal = $(42);

	// Evaluating an expression through the pipe will track all signal accesses:
	console.log(pipe(signal)); // 42
	console.log(pipe(() => signal.value)); // 42

	// This will trigger the callback:
	signal.value = 77;
	```

=== "No Build"
	```jsx
	import { $, trigger } from "./rvx.js";

	// Create a new pipe that is bound to the current lifecycle:
	const pipe = trigger(() => {
		console.log("Signal has been updated.");
	});

	const signal = $(42);

	// Evaluating an expression through the pipe will track all signal accesses:
	console.log(pipe(signal)); // 42
	console.log(pipe(() => signal.value)); // 42

	// This will trigger the callback:
	signal.value = 77;
	```

It is guaranteed that the function is called before any other observers like [`watch`](#watch) or [`watchUpdates`](#watchupdates) are notified. This can be used to run side effects like clearing a cache before an expression is re-evaluated:

=== "JSX"
	```jsx
	import { $, trigger, watch } from "rvx";

	const pipe = trigger(() => {
		console.log("Signal has been updated.");
	});

	const signal = $(42);
	watch(() => {
		console.log("Evaluating...");
		return pipe(signal);
	}, value => {
		console.log("Value:", value);
	});

	signal.value = 77;
	```

=== "No Build"
	```jsx
	import { $, trigger, watch } from "./rvx.js";

	const pipe = trigger(() => {
		console.log("Signal has been updated.");
	});

	const signal = $(42);
	watch(() => {
		console.log("Evaluating...");
		return pipe(signal);
	}, value => {
		console.log("Value:", value);
	});

	signal.value = 77;
	```

```
Evaluating...
Value: 42
Signal has been updated.
Evaluating...
Value: 77
```

If pipes are nested, the callback for the most inner one is called first. In the example below, the callback for `pipeB` is called first:

=== "JSX"
	```jsx
	import { $, trigger } from "rvx";

	const pipeA = trigger(() => console.log("Pipe A"));
	const pipeB = trigger(() => console.log("Pipe B"));

	const signal = $(42);
	pipeA(() => pipeB(signal)); // 42

	signal.value = 77;
	```

=== "No Build"
	```jsx
	import { $, trigger } from "./rvx.js";

	const pipeA = trigger(() => console.log("Pipe A"));
	const pipeB = trigger(() => console.log("Pipe B"));

	const signal = $(42);
	pipeA(() => pipeB(signal)); // 42

	signal.value = 77;
	```

Trigger callbacks run [isolated](./isolation.md) from signal access tracking and the current lifecycle.



## Immediate Side Effects
By default, signal updates are processed immediately. If an update causes recursive side effects, they run in sequence instead.

=== "JSX"
	```jsx
	import { $, watch } from "rvx";

	const count = $(0);

	watch(count, value => {
		console.group("Count:", value);
		if (value < 2) {
			count.value++;
			console.log("New count:", count.value);
		}
		console.groupEnd();
	});

	console.log("Final count:", count.value);
	```

=== "No Build"
	```jsx
	import { $, watch } from "./rvx.js";

	const count = $(0);

	watch(count, value => {
		console.group("Count:", value);
		if (value < 2) {
			count.value++;
			console.log("New count:", count.value);
		}
		console.groupEnd();
	});

	console.log("Final count:", count.value);
	```

```
Count: 0
	New count: 1
Count: 1
	New count: 2
Count: 2
Final count: 2
```



## Memory References
Observers like [`watch`](#watch) and [`trigger`](#trigger), signals and teardown hooks reference each other in the ways described below.

+ Observer registered teardown hooks reference their observers.
+ Observers reference all accessed signals from the latest expression until disposed.
+ Signals reference all current observers.

!!! warning
	Not cleaning up unused observers by calling their teardown hooks can result in memory leaks and other undefined behavior.

	=== "JSX"
		```jsx
		function showNotification(message: unknown) {
			const view = mount(
				document.body,
				<div class="notification">
					<T id="notification-title" />
					{message}
				</div>
			);
			setTimeout(() => view.detach(), 3000);
		}
		```

	=== "No Build"
		```jsx
		function showNotification(message: unknown) {
			const view = mount(
				document.body,
				e("div").class("notification").append(
					T({ id: "notification-title" }),
					message,
				),
			);
			setTimeout(() => view.detach(), 3000);
		}
		```

	Assuming that the `<T>` component accesses some global signal with the current locale code to translate the specified key, calling the `showNotification` function will result in a memory leak, because the teardown hooks from observing that signal are never called.

	In addition, calling this function in a context that did capture teardown hooks can result in unintended behavior.

	This can be fixed by manually capturing teardown hooks and then using these to dispose the notification later:

	=== "JSX"
		```jsx
		function showNotification(message: unknown) {
			const dispose = capture(() => {
				mount(
					document.body,
					<div class="notification">
						<T id="notification-title" />
						{message}
					</div>
				);
			});
			setTimeout(dispose, 3000);
		}
		```

	=== "No Build"
		```jsx
		function showNotification(message: unknown) {
			const dispose = capture(() => {
				mount(
					document.body,
					e("div").class("notification").append(
						T({ id: "notification-title" }),
						message,
					),
				);
			});
			setTimeout(dispose, 3000);
		}
		```

	This prevents any signal related memory leaks and also isolates everything inside `showNotification` from the outside lifecycle context.

!!! tip
	In a development or testing environment, you can set up [leak detection](../testing.md#leak-detection) to automatically detect leaked teardown hooks.



## Troubleshooting
For signal based reactivity to work, the following is required:

+ The value in a signal must be replaced, or the signal must notify observers using `notify` or `update`.
+ The place where the value is used must be able to access the signal by calling a function.

### Deep Updates
Signals don't automatically detect when values are deeply changed. They only detect when values are entirely replaced.
```jsx
const counter = $({ count: 0 });
// This will not trigger any updates:
counter.value.count++;
```

When possible, you should wrap the inner values into signals:
```jsx
const counter = { count: $(0) };
// Signals can also be deeply nested:
const counter = $({ count: $(0) });
```

When this isn't possible, you can use one of the following options:
```jsx
// Use the update function:
counter.update(value => {
	value.count++;
});

// Replace the entire value:
counter.value = { count: 1 };

// Manually notify observers:
counter.value.count++;
counter.notify();
```

If you need deeply reactive objects, you can use the [store API](../store.md).

### Static Values
The value of signals or expressions can always be used in a non reactive ways:

=== "JSX"
	```jsx
	const count = $(0);

	// This isn't reactive:
	<>{count.value}</>;
	<>{get(count)}</>;
	```

=== "No Build"
	```jsx
	const count = $(0);

	// This isn't reactive:
	count.value;
	get(count);
	```

For accesses to be reactive, you need to use a signal directly or access it's value in a function:

=== "JSX"
	```jsx
	// This is now reactive:
	<>{() => count.value}</>;
	<>{() => get(count)}</>;

	// Using the signal itself is also reactive:
	<>{count}</>;
	```

=== "No Build"
	```jsx
	// This is now reactive:
	() => count.value;
	() => get(count);

	// Using the signal itself is also reactive:
	count;
	```
