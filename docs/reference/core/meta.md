# Meta
The meta API can be used to provide information about where a derived signal or computed value originates from. This can be used by e.g. a validation system to find the source of truth to attach validation rules to.

## `setSource / unsetSource`
Set or unset the source that an object originates from:

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
Returns the direct source of an object:

```jsx
const value = $("foo");
const trimmed = trim(value);

getSource(trimmed) === value; // true
```

## `getRoot`
Returns the first object in the chain of sources:

```jsx
const value = $("foo");
const input = debounce(trim(value), 300);

getRoot(input) === value; // true
```

!!! info
	Note that this returns the result of `getRoot` on the target's source at the time `setSource` was called or the target itself. Changes to sources of other objects after that are not taken into account.
