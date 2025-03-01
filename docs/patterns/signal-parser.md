# Signal Parser
Create a mapped signal that parses a string.

This example parses an integer. For error handling, you can use an emitter, callback or signal to pass information out of the `parseInt` function.

=== "JSX"
	```js
	import { $, watchUpdates, Signal } from "rvx";

	function parseInt(source: Signal<number>): Signal<string> {
		const input = $(String(source.value));

		watchUpdates(input, value => {
			if (/^-?\d+$/.test(value)) {
				const raw = Number.parseInt(value);
				if (Number.isSafeInteger(raw)) {
					source.value = raw;
					error.value = null;
				}
			}
		});

		watchUpdates(source, value => {
			input.value = String(value);
		});

		return input;
	}
	```

=== "No Build"
	```js
	import { $, watchUpdates, Signal } from "rvx";

	/**
	 * @param {Signal<number>} source
	 * @returns {Signal<string>}
	 */
	function parseInt(source): Signal<string> {
		const input = $(String(source.value));

		watchUpdates(input, value => {
			if (/^-?\d+$/.test(value)) {
				const raw = Number.parseInt(value);
				if (Number.isSafeInteger(raw)) {
					source.value = raw;
					error.value = null;
				}
			}
		});

		watchUpdates(source, value => {
			input.value = String(value);
		});

		return input;
	}
	```

## Example Usage

=== "JSX"
	```jsx
	<ExampleTextInput value={someSignal.pipe(parseInt)} />
	```

=== "No Build"
	```js
	ExampleTextInput({
		value: someSignal.pipe(parseInt),
	})
	```
