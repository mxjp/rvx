# Conversion Utilities

## `string / optionalString`
[Map](./core/signals.md#map) expression values to strings.

This can be used to avoid the default behavior when setting element attributes regarding booleans, `null` and `undefined`.

=== "JSX"
	```jsx
	import { string, optionalString } from "rvx/convert";

	<div some-value={true} />; // <div some-value="" />
	<div some-value={false} />; // <div />
	<div some-value={null} />; // <div />

	<div some-value={string(true)} />; // <div some-value="true" />
	<div some-value={string(false)} />; // <div some-value="false" />
	<div some-value={string(null)} />; // <div some-value="null" />

	<div some-value={optionalString(true)} />; // <div some-value="true" />
	<div some-value={optionalString(false)} />; // <div some-value="false" />
	<div some-value={optionalString(null)} />; // <div />
	```

=== "No Build"
	```jsx
	import { string, optionalString } from "./rvx.convert.js";

	e("div").set("some-value", true); // <div some-value="" />
	e("div").set("some-value", false); // <div />
	e("div").set("some-value", null); // <div />

	e("div").set("some-value", string(true)); // <div some-value="true" />
	e("div").set("some-value", string(false)); // <div some-value="false" />
	e("div").set("some-value", string(null)); // <div some-value="null" />

	e("div").set("some-value", optionalString(true)); // <div some-value="true" />
	e("div").set("some-value", optionalString(false)); // <div some-value="false" />
	e("div").set("some-value", optionalString(null)); // <div />
	```

## `separated`
Map an expression to join array elements using the specified separator.

+ This can be useful for setting attributes that are represented as space separated lists like many aria attributes.
+ Any non array value is passed through as is.

=== "JSX"
	```jsx
	import { separated } from "rvx/convert";

	// Space is the default separator:
	<div aria-owns={separated(["a", "b"])} />

	// Or specify a custom separator:
	<div aria-owns={separated(["a", "b"], " ")} />
	```

=== "No Build"
	```jsx
	import { separated } from "./rvx.convert.js";

	// Space is the default separator:
	e("div").set("aria-owns", separated(["a", "b"]));

	// Or specify a custom separator:
	e("div").set("aria-owns", separated(["a", "b"], " "));
	```

## `trim`
Create a derived signal for trimming user input.

+ The source signal contains the trimmed value.
+ The input signal contains the un-trimmed value.
+ Updates are processed until the current lifecycle is disposed.

=== "JSX"
	```jsx
	import { trim } from "rvx/convert";

	<TextInput value={someSignal.pipe(trim)} />
	```

=== "No Build"
	```jsx
	import { trim } from "./rvx.convert.js";

	TextInput({ value: someSignal.pipe(trim) })
	```

## `debounce`
Create a derived signal for debouncing user input updates.

+ If the source signal is updated, scheduled updates from the input are aborted.
+ If the input signal is updated, a source update is scheduled with the specified delay and any previously scheduled update is aborted.
+ Updates are processed until the current lifecycle is disposed.

=== "JSX"
	```jsx
	import { debounce } from "rvx/convert";

	<TextInput value={someSignal.pipe(debounce, 300)} />
	```

=== "No Build"
	```jsx
	import { debounce } from "./rvx.convert.js";

	TextInput({ value: someSignal.pipe(debounce, 300) })
	```
