# Elements
JSX expressions and the element builder API can be used to directly create DOM elements:

=== "JSX"
	```jsx
	<div class="example">Hello World!</div>
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js"; // or "rvx"

	e("div").class("example").append("Hello World!")
	```

## Attributes
Attributes are set using `setAttribute` or `removeAttribute` by default.

+ Attributes set to `null`, `undefined` or `false` are removed.
+ Attributes set to `true` are set as an empty string.
+ All other values are set as strings.

=== "JSX"
	+ Attributes prefixed with `prop:` are always set using the respective JavaScript properties.
	+ Attributes prefixed with `attr:` are always set using the default behavior.
	+ Attributes prefixed with `on:` are added as regular event listeners. An array can be used to pass the event listener with additional options.
	+ The [`class`](#classes) and [`style`](#styles) attributes are special cases described below.

	```jsx
	// Using setAttribute:
	<input value="Example" />

	// Using the "value" property:
	<input prop:value="Example" />

	// Setting a boolean attribute:
	<input disabled />;
	<input disabled={true} />

	// Removing a boolean attribute:
	<input disabled={false} />

	// Adding event listeners:
	<button on:click={event => { ... }} />
	<button on:click={[event => { ... }, { capture: true, passive: true }]} />
	```

=== "No Build"
	```jsx
	// Using setAttribute:
	e("input").set("value", "Example")

	// Using the "value" property:
	e("input").prop("value", "Example")

	// Setting a boolean attribute:
	e("input").set("disabled", true)

	// Removing a boolean attribute:
	e("input").set("disabled", false)

	// Adding event listeners:
	e("input").on("click", event => { ... })
	e("input").on("click", event => { ... }, { capture: true, passive: true })
	```

Attribute values can be [expressions](signals.md#expressions).

=== "JSX"
	```jsx
	// Static values:
	<div title="Hello World!" />
	<div title={"Hello World!"} />

	// Signals:
	<div title={someSignal} />

	// Functions:
	<div title={() => someSignal.value} />
	```

=== "No Build"
	```jsx
	// Static values:
	e("div").set("title", "Hello World!")

	// Signals:
	e("div").set("title", someSignal)

	// Functions:
	e("div").set("title", () => someSignal.value)
	```

Note, that the rules specified above apply to all attributes including aria attributes. To set an attribute to the literal `"true"` and `"false"` strings, you can convert an arbitrary [expression](signals.md#expressions) using `string` or `optionalString`:

=== "JSX"
	```jsx
	import { string, optionalString } from "rvx";

	// Convert all values to strings including "null" and "undefined":
	<div aria-disabled={string(someBooleanExpression)} />

	// Convert values to strings excluding "null" or "undefined":
	<div aria-disabled={optionalString(someBooleanExpression)} />
	```

=== "No Build"
	```jsx
	import { string, optionalString, e } from "./rvx.js";

	// Convert all values to strings including "null" and "undefined":
	e("div").set("aria-disabled", string(someBooleanExpression))

	// Convert values to strings excluding "null" or "undefined":
	e("div").set("aria-disabled", optionalString(someBooleanExpression))
	```

## Classes
The `class` attribute can be any combination of class tokens, arrays and objects with boolean [expressions](signals.md#expressions) to determine which classes are added. `undefined`, `null` and `false` is ignored.

=== "JSX"
	```jsx
	<div class="example" />
	<div class={[
		"foo",
		() => "bar",
		{
			baz: true,
			boo: () => false,
		},
	]} />
	```

	To avoid this special behavior, you can use the `attr:` prefix:
	```jsx
	<div attr:class="example">
	```

=== "No Build"
	```jsx
	e("div").class("example")
	e("div").class([
		"foo",
		() => "bar",
		{
			baz: true,
			boo: () => false,
		},
	])
	```

	To avoid this special behavior, you can use the `set` function:
	```jsx
	e("div").set("class", "example")
	```

## Styles
The **style** attribute can be any combination of arrays, objects and [expressions](signals.md#expressions).

Properties use the same casing as in css.

=== "JSX"
	```jsx
	<div style={{ color: "red" }} />
	<div style={[
		{
			"color": "red",
			"font-size": "1rem",
		},
		() => ({ "color": () => "blue" }),
		{ "color": someSignal },
		[
			{ "width": "42px" },
		],
	]} />
	```

	To avoid this special behavior, you can use the `attr:` prefix:
	```jsx
	<div attr:style="color: red;">
	```

=== "No Build"
	```jsx
	e("div").style({ color: "red" })
	e("div").style([
		{
			"color": "red",
			"font-size": "1rem",
		},
		() => ({ "color": () => "blue" }),
		{ "color": someSignal },
		[
			{ "width": "42px" },
		],
	])
	```

	To avoid this special behavior, you can use the `set` function:
	```jsx
	e("div").set("style", "color: red;");
	```

Note, that properties that are no longer specified after a signal update are not reset automatically to keep the current implementation simple. When properties are specified multiple times, the last one has priority used.

## References

=== "JSX"
	To get the reference to an element, you can either use the JSX expression directly:

	```jsx
	const input = <input /> as HTMLInputElement;
	```

	Or use the special `ref` attribute:
	```jsx
	<input ref={input => { ... }} />;
	```

	All attributes (except `key`) are processed in the specified order. In the example below, the `ref` function is called after `data-a` is set, but before `data-b` is set:
	```jsx
	<input data-a ref={input => { ... }} data-b />;
	```

=== "No Build"
	To get references to an element, you can reference the builder's `elem` property.

	```jsx
	const input = e("input").elem;
	```

## Content
Everything listed below can be used as element content or can be returned from [component](components.md) functions.

### Text
Expressions (static values, signals and functions) are rendered as escaped text content. `null` and `undefined` are rendered as an empty string:

=== "JSX"
	```jsx
	<div>
		Static text
		{"Static text"}
		{someSignal}
		{() => someSignal.value}
	</div>
	```

=== "No Build"
	```jsx
	e("div").append(
		"Static text",
		someSignal,
		() => someSignal.value
	)
	```

### Nodes
Any DOM nodes are moved into the parent element.

=== "JSX"
	```jsx
	<div>
		<input />
		{document.createElement("div")}
	</div>
	```

=== "No Build"
	```jsx
	e("div").append(
		e("input"),
		document.createElement("div")
	)
	```

Note, that nodes are removed from their parent depending on when the content is actually used in an element. E.g. when returning a document fragment from a [component](components.md), it's children are removed from the fragment as soon as the components return value is used in an element expression.

Reusing DOM nodes may result in undefined behavior. Consider using [`movable`](./views/movable.md) for safely reusing & moving arbitrary content.

If objects have a `NODE` symbol property, this node is used instead. This is internally used by the builder API, but you can also implement your own:

=== "JSX"
	```jsx
	import { NODE } from "rvx";

	<div>
		{{ [NODE]: document.createElement("div") }}
	</div>
	```

=== "No Build"
	```jsx
	import { NODE, e } from "./rvx.js";

	e("div").append(
		{ [NODE]: document.createElement("div") }
	)
	```

### Views
[Views](views/index.md) are an abstraction for sequences of DOM nodes that may change over time. When views are used as content, they are owned by the element expression until the [lifecycle](lifecycle.md) during which the element was created is disposed.

=== "JSX"
	```jsx
	import { Show } from "rvx";

	<div>
		<Show when={someSignal}>
			{() => <>Hello World!</>}
		</Show>
	</div>
	```

=== "No Build"
	```jsx
	import { Show, e } from "./rvx.js";

	e("div").append(
		Show({
			when: someSignal,
			children: () => "Hello World!",
		})
	)
	```

Reusing view instances may result in undefined behavior. Consider using [`movable`](./views/movable.md) for safely reusing & moving arbitrary content.

### Arrays & Fragments
Content can be wrapped in arbitrarily nested arrays and JSX fragments.

=== "JSX"
	```jsx
	<div>
		<>
			{[
				"Hello World!",
				<div />,
			]}
		</>
	</div>
	```

	Note, that JSX fragments in rvx return their children as is. The return type of single-child or empty fragments may depend on your JSX transpiler.
	```jsx
	<></> // undefined
	<>42</> // 42
	<>foo{"bar"}</> // ["foo", "bar"]
	```

=== "No Build"
	```jsx
	e("div").append([
		[
			["Hello World!"],
			e("div"),
		],
	])
	```

## Namespaces
By default, elements are created as HTML elements. This works fine for most cases, but requires some extra work to create **SVG** or **MathML** elements.

The namespace URI for new elements can be [injected](context.md).

=== "JSX"
	```jsx
	import { Inject, XMLNS, SVG } from "rvx";

	<Inject context={XMLNS} value={SVG}>
		{() => <svg viewBox="0 0 100 100">...</svg>}
	</Inject>
	```

=== "No Build"
	```jsx
	import { XMLNS, SVG } from "./rvx.js";

	XMLNS.inject(SVG, () => {
		return e("svg").set("viewBox", "0 0 100 100").append(...)
	})
	```
