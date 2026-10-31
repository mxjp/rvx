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

The current value can be accessed or updated using the `value` or `inert` properties:
```jsx
// With access tracking:
count.value++;

// Without access tracking:
count.inert++;
```

To deeply change a value, use an object signal and manually call `notify()`:
```jsx
const items = $obj(["a", "b"]);

items.inert.push("c");
items.notify();
```

Signals can be accessed manually without actually using the current value:
```jsx
// Pretend that count was accessed:
count.access();
```

Observers can also be notified manually, but might not re-run if their last known value of the signal is equal to the current one:
```jsx
count.inert++;
count.notify();
```

## Equality
Observers re-run when any accessed signal or computed value has changed. By default, `Object.is` is used for checking if two values are equal.
```jsx
const count = $(42);

watch(() => {
	console.log(count.value);
});

// This has no effect because the value is already 42:
count.value = 42;
```

```jsx
const a = $(3);
const b = $(4);

const c = computed(() => a.value + b.value);

watch(c, result => {
	console.log(result);
});

// This has no effect because the computed result stays 7:
a.value = 4;
b.value = 3;
```

The equality check can be customized:

=== "JSX"
	```jsx
	import { $, computed, eq } from "rvx";

	const count = $(7, eq((a, b) => a == b));

	// This is now considered the same as 7:
	count.value = "7";

	computed(() => { ... }, eq((a, b) => a == b));
	```

=== "No Build"
	```jsx
	import { $, computed, eq } from "./rvx.js";

	const count = $(7, eq((a, b) => a == b));

	// This is now considered the same as 7:
	count.value = "7";

	computed(() => { ... }, eq((a, b) => a == b));
	```

## Object Signals
Object signals are meant for modifying values in place for more efficient atomic updates.

Use the `$obj` shorthand to create an object signal:

=== "JSX"
	```jsx
	import { $obj } from "rvx";

	const map = $obj(new Map());
	```

=== "No Build"
	```jsx
	import { $obj } from "./rvx.js";

	const map = $obj(new Map());
	```

To modify a value in an object signal, use the `inert` property followed by calling `notify()`:

```jsx
const map = $obj(new Map());

watch(() => Array.from(map.value), entries => {
	console.log("Current entries:", entries);
});

map.inert.set("a", 1);
map.inert.set("b", 2);
map.notify();
```

!!! note
	Calling `notify` on an object signal always causes observers to re-run regardless of how or if the value was actually modified.

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

## Scheduling
When any signal is updated, affected observers re-run on the next microtask by default.

Updates can be processed immediately by calling `dispatch`:

=== "JSX"
	```jsx
	import { $, dispatch, watch } from "rvx";

	const count = $(0);

	watch(count, value => {
		console.log("Count:", value);
	});

	count.value = 1;
	count.value = 2;

	dispatch(); // Logs "Count: 2"
	```

=== "No Build"
	```jsx
	import { $, dispatch, watch } from "./rvx.js";

	const count = $(0);

	watch(count, value => {
		console.log("Count:", value);
	});

	count.value = 1;
	count.value = 2;

	dispatch(); // "Count: 2"
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
	You can use [`untrack`](#untrack) to ignore specific signal accesses or [`isolate`](isolation.md) all side effects of arbitrary code.

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

## `computed`
Wrap an expression to re-run only when any accessed signal has been updated.

=== "JSX"
	```jsx
	import { computed } from "rvx";

	const getValue = computed(() => a.value * b.value);
	```

=== "No Build"
	```jsx
	import { computed } from "./rvx.js";

	const getValue = computed(() => a.value * b.value);
	```

+ The [context](context.md) from where `computed` was called is available in the expression.
+ Teardown hooks in the expression are not supported.
+ The expression only re-runs when the result is accessed after any used signal has been updated.
+ Observers only re-run when the result is not equal to the previous one (see [Equality](#equality) for custom checks).

## `untrack`
Evaluate an expression and isolate signal accesses from the current observer.

=== "JSX"
	```jsx
	import { untrack } from "rvx";

	watch(() => someSignal.value * untrack(someOtherSignal), () => { ... });
	```

=== "No Build"
	```jsx
	import { untrack } from "./rvx.js";

	watch(() => someSignal.value * untrack(someOtherSignal), () => { ... });
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

## `mapArray`
Run a function for each entry in an iterable expression.

+ By default, entries are keyed by value.
+ The current [context](./context.md) is available in the map function.
+ Evaluation is stopped when the current [lifecycle](./lifecycle.md) is disposed.
+ Teardown hooks from within the map function are called when an entry is removed or when the current [lifecycle](./lifecycle.md) is disposed.
+ Returns a function to reactively access the latest result.

=== "JSX"
	```jsx
	import { $, mapArray, watch } from "rvx";

	const items = $([1, 2, 3]);

	const mappedItems = mapArray(items, (value, index) => {
		watch(index, index => {
			console.log(value, "is at index", index);
		});

		return value * 2;
	});

	watch(mappedItems, values => console.log(values));
	```

=== "No Build"
	```jsx
	import { $, mapArray, watch } from "./rvx.js";

	const items = $([1, 2, 3]);

	const mappedItems = mapArray(items, (value, index) => {
		watch(index, index => {
			console.log(value, "is at index", index);
		});

		return value * 2;
	});

	watch(mappedItems, values => console.log(values));
	```

You can specify a function to get a custom key for a given value:

```jsx
mapArray(someMap, (entry, index) => { ... }, entry => `${entry[0]}/${entry[1]}`);
```

Note that updates to anything other than the computed key are ignored.

## Immediate Side Effects
If an update causes recursive side effects, they are processed in sequence.

=== "JSX"
	```jsx
	import { $, dispatch, watch } from "rvx";

	const count = $(0);

	watch(count, value => {
		console.group("Count:", value);
		if (value < 2) {
			count.value++;
			dispatch();
			console.log("New count:", count.value);
		}
		console.groupEnd();
	});

	dispatch();
	console.log("Final count:", count.value);
	```

=== "No Build"
	```jsx
	import { $, dispatch, watch } from "./rvx.js";

	const count = $(0);

	watch(count, value => {
		console.group("Count:", value);
		if (value < 2) {
			count.value++;
			dispatch();
			console.log("New count:", count.value);
		}
		console.groupEnd();
	});

	dispatch();
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

Note that [`computed`](#computed) is not an observer itself, but acts as one while its result is accessed by another observer and does not affect references otherwise.

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



## Troubleshooting
For signal based reactivity to work, the following is required:

+ The value of a signal is replaced via the `value` property or `notify` is called on an object signal.
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
// Replace the entire value:
counter.value = { count: 1 };

// Use an object signal instead to modify the value in place and notify observers:
const counter = $obj({ count: 0 });
counter.inert.count++;
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

For accesses to be reactive, you need to use a signal directly or ensure that its value is accessed through a function call:

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
