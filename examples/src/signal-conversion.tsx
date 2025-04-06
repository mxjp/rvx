/*

# Signal Conversion
When building user inputs, signals are the best way to pass data in and out of your components.

This example shows two functions `trim` and `debounce` that can be combined to change the behavior of inputs.

!!! info
	Note, that these two functions are already available in rvx, but are a good place to start if you need to customize that behavior in any way.

	```jsx
	import { trim, debounce } from "rvx/convert";
	```

*/

import { $, Signal, watchUpdates } from "rvx";
import { useTimeout } from "rvx/async";

function trim(source: Signal<string>) {
	const input = $(source.value, source);

	// Trim and write into the source signal:
	watchUpdates(input, value => {
		source.value = value.trim();
	});

	// Write into the input when the trimmed version is different:
	watchUpdates(source, value => {
		if (input.value.trim() !== value) {
			input.value = value;
		}
	});

	return input;
}

function debounce<T>(source: Signal<T>, delay: number) {
	const input = $<T>(source.value);

	// Schedule writing into the source signal:
	watchUpdates(input, value => {
		if (!Object.is(source.value, value)) {
			// This timeout is cleared automatically
			// before the next input update is processed
			// or when the outside lifecycle is disposed:
			useTimeout(() => { source.value = value }, delay);
		}
	});

	// Always write into the input signal:
	watchUpdates(source, value => {
		input.value = value;
	});

	return input;
}

export function Example() {
	const text = $("Hello World!");
	return <div class="column">
		<div class="row">
			Trim: <TextInput value={text.pipe(trim)} />
		</div>
		<div class="row">
			Trim & debounce: <TextInput value={text.pipe(trim).pipe(debounce, 500)} />
		</div>
		<div>
			You typed: <b>{() => JSON.stringify(text.value)}</b>
		</div>
	</div>;
}

function TextInput(props: {
	value: Signal<string>;
}) {
	return <input
		type="text"
		prop:value={props.value}
		on:input={event => {
			props.value.value = (event.target as HTMLInputElement).value;
		}}
	/>;
}
