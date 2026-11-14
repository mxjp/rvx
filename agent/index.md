# Rvx
This document is meant as a compact quick reference for rvx.

+ Prefer working with this reference only.
+ If more detail is required, search by keyword in "../docs", "../examples/src" or typedefs with jsdoc in "../dist/es/*.d.ts".

# Core API
Rvx core API can be imported from `rvx`.

## Signals
+ `Expression<T>` - Type for a static value, Signal or function to get a value.
  + `42` - Static value.
  + `$(42)` - Signal.
  + `() => signal.value * 3` - Function to get the value.
+ `Reactive<T>` - Utility type for values that must be reactive.
+ `signal = $(value, eq?)` - Create a `Signal<T>`.
  + `signal.value` - Reactively get or set the value.
  + `signal.inert` - Get or set the value without tracking or notifying.
  + `signal.active` - Check for active observers.
  + `signal.access()` - Track the signal manually.
  + `signal.notify()` - Notify observers of a possible change.
  + `signal.pipe(fn, ...args)` - Call a function with this signal as first argument.
+ `objSignal = $obj(value?)` - Create a signal for in-place mutable objects.
  + `objSignal.inert` - Use `inert` to mutate the value.
  + `objSignal.notify()` - Pretend that the value has been changed & notify observers.
+ `fn = computed(expr, eq?)` - Wrap an expression to re-run only when any accessed observable has changed.
+ `fn = computedObj((update, value) => {}, initial?)` - Like `computed` but with mutable state. Call `update(value)` to pretend the value has changed.
+ `watch(expr, effect?)` - Watch an expression.
	+ `expr` and `effect` run once immediately and for subsequent updates.
+ `first = watchUpdates(expr, effect)` - Like `watch`, but returns the first result & calls the effect for subsequent updates.
+ `value = get(expr)` - Evaluate an expression.
+ `value = untrack(expr)` - Evaluate an expression without tracking.
+ `expr = map(expr, value => value)` - Map an expression value preserving staticness.
+ `pipe = trigger(effect)` - Call `pipe(expr)` to evaluate expressions & schedule `effect` once when accessed observables change.
+ `isTracking()` - Check if accesses are tracked in this context.
+ `dispatch()` - Run scheduled effects immediately.
+ `schedule(effect)` - Schedule an effect to run in series with signal updates.
+ `eq((prev, next) => boolean)` - Create a custom state equality check to pass to `$` or `computed`. Default uses `Object.is`.

## Lifecycle
+ `teardown(hook)` - Register a teardown hook to run when the current lifecycle is disposed. Throws outside of a lifecycle context.
+ `dispose = capture(fn)` - Run a function while capturing teardown hooks. `dispose()` runs hooks in reverse registration order.
+ `value = captureSelf(fn)` - The same as `capture`, but the dispose function is passed to the function as first argument.
+ `value = teardownOnError(fn)` - Run a function & dispose immediately on error.
+ `value = leak(fn)` - Run a function ignoring teardown hooks.
+ `value = isolate(fn, ...args)` - Run a function in isolation from the current lifecycle or access tracking context.

## Context
+ `EXAMPLE = new Context(default)` - Create a context.
  + `EXAMPLE.default` - Get or set the default value.
  + `EXAMPLE.current` - Get the current value.
  + `EXAMPLE.provide(value, fn, ...args)` - Run a function while providing a value.
  + `EXAMPLE.with(value)` - Create a `ContextState` (context-value pair).
  + `result = Context.provide(states, fn, ...args)` - Provide multiple states.
  + `result = Context.isolate(states, fn, ...args)` - Same as `provide` but also isolates from the current context.
  + `states = Context.capture()` - Capture all context-value pairs in the current context.
  + `fn = Context.bind(fn)` - Bind a function to all current context-value pairs for e.g. running later in the same context.
+ `<Provide context={ctx} value={v}>{component}</Provide>` - Provide a context value.

## Components
Components (`Component<TProps, TContent?>`) are functions that return initial content.
+ Props are passed as the first argument.
+ In JSX, children are passed via the `children` property.
+ Use `Expression<T>` to accept reactive properties.
+ Use `Signal<T>` to accept values that the component can write back into.
+ Lifecycle hooks are generally supported inside components.

## JSX
+ `<div title="example">{content}</div>` - JSX expressions create real DOM elements.
  + `name={expr}` - Attributes accept expressions. `null`, `undefined` or `false` are removed, `true` is set as an empty string. Other values are converted to strings.
	+ `attr:name={expr}` - Set using `setAttribute` / `removeAttribute`. This is the default behavior except for `class` & `style`.
	+ `prop:name={expr}` - Set using a JavaScript property.
  + `on:click={event => ...}` - Add an event listener. Pass `[listener, options]` for listener options. The current context is available in listeners.
	+ `class={value}` - Any combination of class tokens, arrays and objects with boolean expressions to determine which classes are added.
		+ `undefined`, `null` and `false` are ignored.
		+ E.g. `class={["foo", () => "bar", { baz: true, boo: () => false }]}`
		+ Use the `ClassValue` type for values for this attribute.
  + `style={value}` - Any combination of arrays, objects and expressions (`StyleValue` / `StyleMap`). Properties use css casing.
		+ E.g. `style={[{ "color": "red", "font-size": "1rem" }, () => ({ "color": () => "blue" }), { "color": someSignal }, [{ "width": "42px" }]]}`
		+ Use the `StyleValue` type for values for this attribute.
+ `<Override ...attrs>{content}</Override>` - Apply JSX attribute overrides to an existing element.
+ `applyElement(elem, attrs)` - Set JSX attributes on an existing element.

## Element Builders
+ Use element builders only if JSX is not supported.
+ `e("div").class("example").append("Hello World!")` - Builder calls create real DOM elements & can be chained.
+ `builder = e(tagName)` - Create an element builder.
  + `.set(name, expr)` - Same as JSX `attr:name={expr}`.
  + `.prop(name, expr)` - Same as JSX `prop:name={expr}`.
  + `.class(value)` - Same as JSX `class={value}`.
  + `.style(value)` - Same as JSX `style={value}`.
  + `.on(type, listener, options?)` - Same as JSX `on:type={[listener, options]}`.
  + `.append(...content)` - Same as JSX element children.
  + `.elem` - The target element.
+ `builder = override(target)` - Get an element builder for an existing element or element builder.

## Supported content
The following can be used as element content & returned from components:
+ `null` and `undefined` are ignored.
+ Expressions (static values, signals & functions) rendered as escaped text.
+ DOM nodes, JSX expressions or element builders.
+ Views.
+ Arbitrarily nested arrays & JSX Fragments.

## Views & Rendering
Views are an abstraction for sequences of DOM nodes that change over time.
+ `view = render(content)` - Create a `View` from supported content.
+ `view = mount(parent, content)` - Same as `render`, but the view is appended to the parent DOM node for the current lifecycle.
+ `component = movable(content)` - Wrap rendered content for safely moving it into different places.
	+ Reusing the returned component removes content from its previous position.
+ `viewNodes(view)` - Get an iterator over current nodes of a view.

### JSX
+ `<Nest>` - Re-render content when an expression changes:
	+ `<Nest watch={expr}>{value => content}</Nest>`
	+ `<Nest watch={() => component} />`
+ `<Show when={expr}>{value => content}</Show>` - Render conditional content.
	+ The condition is internally memoized via `computed`.
+ `<For each={expr}>{(value, getIndex) => content}</For>` - Render content for each item in an iterable keyed by identity.
+ `<Index each={expr}>{(getValue, index) => content}</Index>` - Render content for each index in an iterable.
+ `<Attach when={expr}>{content}</Attach>` - Attach content while a condition matches.

### No Build
+ `nest` - Re-render content when an expression changes:
	+ `nest(expr, value => content)`
	+ `nest(() => component)`
+ `when(condition, value => content, fallbackComponent?)` - Render conditional content.
	+ The condition is internally memoized via `computed`.
+ `forEach(each, (value, getIndex) => content)` - Render content for each item in an iterable keyed by identity.
+ `indexEach(each, (getValue, index) => content)` - Render content for each index in an iterable.
+ `attachWhen(expr, content)` - Attach content while a condition matches.
+ `fn = mapArray(expr, mapFn)` - Map each item in an iterable keyed by identity with lifecycle support.

## Namespaces
+ `XMLNS` - A `Context<XMLNS>` for the namespace of newly created elements.
+ `HTML` / `SVG` / `MATHML` - Namespace URIs. E.g. `<Provide context={XMLNS} value={SVG}>{() => <svg>...</svg>}</Provide>`

## Events
+ `emitter = new Emitter<[...args]>()` - Create an event emitter.
  + `emitter.event(listener)` - Subscribe for the duration of the current lifecycle.
  + `emitter.emit(...args)` - Emit.
+ `Event<[...args]>` can be used as component props. E.g. `<Example onMessage={emitter.event} />`

## Unique IDs
+ `uniqueId()` - Allocate a unique id like `"rvx_77"` for use as e.g. element ids.
+ `uniqueIdFor(object)` - Get a stable id for an object.
+ `useUniqueId(component)` - Provide a unique id to children.
+ `<UseUniqueId>{id => content}</UseUniqueId>` - Same as `useUniqueId`.

## Meta
+ `setSource(target, source)` / `unsetSource(target)` - Set or unset a source of truth.
+ `getSource(target)` / `getRoot(target)` - Get a source of truth.

# Additional modules
+ [`ENV`](./env.md) - Context for accessing browser APIs. Can be used for server-side rendering, testing etc.
+ [`rvx/async`](./async.md) - Async rendering, queues, tasks, timers & `watchFor`.
+ [`rvx/convert`](./convert.md) - Utilities: `debounce`, `trim`, `string`, `optionalString`, `separated`.
+ [`rvx/dom`](./env.md) - DOM implementation for fast server-side rendering.
+ [`rvx/element`](./element.md) - Building web components.
+ [`rvx/router`](./router.md) - Routing with location hash, history API or in memory.
+ [`rvx/store`](./store.md) - Deep reactive wrappers / proxies.
+ [`rvx/test`](./test.md) - Testing utilities: `runTest`, `poll`, view queries.
