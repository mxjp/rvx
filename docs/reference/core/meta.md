# Meta
The meta API can be used to provide information about where a derived signal or computed value originates from. This can be used by e.g. a validation system to find the source of truth to attach validation rules to.

## `setSource / unsetSource`
Set or unset the direct source of truth:

```jsx
import { $, setSource, Signal } from "rvx";

function trim(source: Signal<string>): Signal<string> {
	const input = $(source.value);

	// Mark the source of truth of this signal:
	setSource(input, source);

	// ...
}
```

## `getSource`
Returns the direct source of truth if any:

```jsx
const value = $("foo");
const trimmed = trim(value);

getSource(trimmed) === value; // true
```

## `getRoot`
Returns the root source of truth:

```jsx
const value = $("foo");
const input = debounce(trim(value), 300);

getRoot(input) === value; // true
```

!!! info
	The root is resolved when `setSource` is called. Changes to sources of other objects after that are not taken into account.
