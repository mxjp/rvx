# Signal Debounce
Create a mapped signal that writes updates back to the source signal with a delay.

=== "JSX"
	```jsx
	import { $, watchUpdates, Signal } from "rvx";

	function debounce<T>(source: Signal<T>, delay: number): Signal<T> {
		const input = $(source.value);

		watchUpdates(input, value => {
			if (source.value !== value) {
				const timer = setTimeout(() => source.value = value, delay);
				teardown(() => clearTimeout(timer));
			}
		});

		watchUpdates(source, value => {
			input.value = value;
		});

		return input;
	}
	```

=== "No Build"
	```js
	import { $, watchUpdates, Signal } from "./rvx.js";

	/**
	 * @template T
	 * @param {Signal<T>} source
	 * @param {number} delay
	 * @returns {Signal<T>}
	 */
	function debounce(source, delay) {
		const input = $(source.value);

		watchUpdates(input, value => {
			if (source.value !== value) {
				const timer = setTimeout(() => source.value = value, delay);
				teardown(() => clearTimeout(timer));
			}
		});

		watchUpdates(source, value => {
			input.value = value;
		});

		return input;
	}
	```

## Example Usage

=== "JSX"
	```jsx
	<ExampleTextInput value={someSignal.pipe(debounce, 300)} />
	```

=== "No Build"
	```jsx
	ExampleTextInput({
		value: someSignal.pipe(debounce, 300),
	})
	```
