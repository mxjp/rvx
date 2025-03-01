# Signal Trim
Create a mapped signal that writes trimmed values back to the source signal.

=== "JSX"
	```jsx
	import { $, watchUpdates, Signal } from "rvx";

	function trim(source: Signal<string>): Signal<string> {
		const input = $(source.value);

		watchUpdates(input, value => {
			source.value = value.trim();
		});

		watchUpdates(source, value => {
			if (value !== input.value.trim()) {
				input.value = value;
			}
		});

		return input;
	}
	```

=== "No Build"
	```jsx
	import { $, watchUpdates, Signal } from "./rvx.js";

	/**
	 * @param {Signal<string>} source
	 * @returns {Signal<string>}
	 */
	function trim(source) {
		const input = $(source.value);

		watchUpdates(input, value => {
			source.value = value.trim();
		});

		watchUpdates(source, value => {
			if (value !== input.value.trim()) {
				input.value = value;
			}
		});

		return input;
	}
	```

## Example Usage

=== "JSX"
	```jsx
	<ExampleTextInput value={someSignal.pipe(trim)} />
	```

=== "No Build"
	```jsx
	ExampleTextInput({
		value: someSignal.pipe(trim),
	})
	```
