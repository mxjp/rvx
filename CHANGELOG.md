# Changelog

## 19.7
+ **Deprecated:** `created` will be removed in the next major version. `created` is now an alias for `useMicrotask` and has lifecycle support.
+ **Deprecated:** `string` & `optionalString` have been moved to `rvx/convert` and will be removed from the core module in the next major version.
+ Add optional `source` field to signals.
+ Add `poll` test utility.
+ Add `useMicrotask` utility.
+ Add `useTimeout` utility.
+ Add `useInterval` utility.

## 19.6
+ Use exact prototypes for wrapping objects in `rvx/store`.
+ Add `uniqueIdFor` utility.

## 19.5
+ Export `Falsy` utility type.
+ Export default barrier from `rvx/store`.
+ Remove all internal circular module dependencies.

## 19.4
+ Support teardown hooks in `memo`.
+ **Deprecated:** `Range` will be removed from `rvx/dom` in the next major version.

## 19.3
+ Add append fallback to `View.insertBefore`.

## 19.2
+ Support direct content reuse in `<Nest> / nest` and `<Show> / when`.
+ `<Nest> / nest` component is now optional if the expression returns a component, null or undefined.

## 19.1
+ Add non JSX component variants: `nest`, `when`, `attachWhen`, `forEach`, `indexEach`, `nestAsync`, `routes`.

## 19.0
+ **Breaking:** `<Nest>` now has a `watch` property and uses the `children` property as component directly.
+ **Breaking:** Remove the `sig` shorthand. Use `$` instead.
+ **Breaking:** Remove `View.take`. Use `View.appendTo`, `View.insertBefore` or `View.detach` instead.
+ **Breaking:** Remove `DefaultContext`. Use `Context` instead.
+ **Breaking:** Remove `TaskSlot`. Use `Queue` instead.
+ **Breaking:** Remove `"rvx/builder"` export.
+ **Deprecated:** `IndexFor` will be removed in the next major version. Use `Index` instead.

## 18.12
+ Add `$` shorthand for creating signals.
+ **Deprecated:** The `sig` shorthand will be removed in the next major version.

## 18.11
+ `MovableView.move` is now bound by default.

## 18.10
+ Add `Context.capture` utility.

## 18.9
+ Add `RouteProps` interface.

## 18.8
+ Add `View.appendTo`, `View.insertBefore` utilities.
+ **Deprecated:** `View.take` will be removed in the next major version. Use `View.appendTo`, `View.insertBefore` or `View.detach` instead.
+ Improve initial render & update performance when using nested components with multiple child nodes in `<Nest>`, `<Show>`, `<Attach>`, `<For>` and `<IndexFor>`:
	+ Updates are about 300-500x faster in chromium based browsers.
	+ Initial render & updates are about 1-4x faster in firefox.
	+ This was mostly caused by the use of the `Range` and `View.take()` APIs encouraging unnecessary or slow DOM modifications.

## 18.7
+ Stabelize `ENV` context API.
+ Expose router's internal `parse` function for manual invocation & overriding.

## 18.6
+ Add experimental `ENV` context API.
+ Add experimental `"rvx/dom"` module.

## 18.5
+ `Context` now has a global default value.
+ **Deprecated:** The `DefaultContext` export will be removed in the next major version. Use `Context` instead.
+ `AsyncContext` now supports custom parent objects.

## 18.4
+ `TaskSlot` has been renamed to `Queue` with a deprecated alias export.
+ **Deprecated:** The `TaskSlot` export will be removed in the next major version.

## 18.3
+ The `NodeTarget` interface is no longer experimental.
+ Optimize initial render performance for the `"class"` attribute.
+ Moved the element builder API to `"rvx"`.
+ **Deprecated:** The `"rvx/builder"` export will be removed in the next major version.

## 18.2
+ Implement atomic updates for `class` attributes.

## 18.1
+ Add `DefaultContext` utility.

## 18.0
+ **Breaking:** Removed custom equality check from `Signal`, `sig`, `ProbeSignal` and `memo`.

## 17.2
+ Add `created` lifecycle hook.

## 17.1
+ Add `Reactive` utility type.

## 17.0
+ **Breaking:** Replaced the entire context API.
+ **Breaking:** Rename `isolate` to `teardownOnError`.
+ **Breaking:** Moved `uniqueId` and `UseUniqueId` to `rvx/id`.
* **Breaking:** Moved event system to `rvx/event`.
+ **Breaking:** Replaced `URLSearchParams` in `rvx/router` with a `Query` object for lazy parsing.

## 16.2
+ Allow `undefined` in context values.

## 16.1
+ Add `Component` utility type.
+ Fix observer tracking isolation.

## 16.0
+ Rebranded **Gluon** to **Rvx**.
+ **Breaking:** Replace `e` function with an element builder API.

## 15.1
+ Add new `trigger` API.

## 15.0
+ **Breaking:** Remove all shared globals & utilities. This also breaks interoperability with other major versions.
+ **Breaking:** Removed `lazy` and `trigger`.
+ **Breaking:** Removed `sequential` param from `watch`, `watchUpdates` and `effect`. Immediate recusrive side effects are now always unfolded into a sequence.
+ **Breaking:** Batches now also run immediate follow up side effects in the same batch until no more updates are queued.
+ **Breaking:** Batch processing now stops if an error occurs, but the linking between signals and unnotified observers will remain.
+ Fix potential memory leak with signals that are never updated.
+ Improve batch stack memory usage.
+ Improve signal access tracking memory usage & performance.

## 14.3
+ Add `isolate` utility.

## 14.2
+ Allow arbitrary values as content in the `e()` shorthand.

## 14.1
+ Add special `ref` attribute.

## 14.0
+ **Breaking:** Regular events are now prefixed with `on:`.
+ **Breaking:** Capturing events prefixed with `$$` have been removed. An object with event listener options can be used instead.

## 13.0
+ **Breaking:** Batches now run even if an error is thrown to prevent breaking unrelated signal cycles.
+ **Breaking:** Teardown hooks for the same `capture` or `captureSelf` call are now called in reverse order.
+ **Breaking:** If the function passed to `capture` or `captureSelf` throws an error, teardown hooks are now automatically called in reverse order and the error is re-thrown.
+ **Breaking:** `<For>` and `<IndexFor>` now abort the current update if an error is thrown as if the previous item was the last one and re-throw the error.

## 12.0
+ **Breaking:** Public exports have been removed: `appendContent`, `setAttributes`, `createText`.

## 11.1
+ **Deprecated:** Public exports will be removed: `appendContent`, `setAttributes`, `createText`.
+ Add `MemoryRouter`.

## 11.0
+ **Breaking:** `trigger` argument has been removed from `watch`, `watchUpdates` and `effect`.
+ **Breaking:** Immediate render side effects in `<Nest>`, `<Show>`, `<For>` and `<IndexFor>` are now sequential.
+ Support practically infinite unique ids.
+ Support infinitely chained immediate signal updates.
+ Add `sequential` parameter to `watch` & `effect`.

## 10.2
+ Support immediate side effects in `watch` callbacks.
+ Support immediate render side effects in `<Nest>` and `<Show>`.

## 10.1
+ Add `RvxElement` as a base for web components.
+ Fix signal equality check of `NaN` values.

## 10.0
+ **Breaking:** Remove `trimBase` path utility. Use `relative` instead.
+ **Breaking:** Fix nested routing behavior for history routers with a base path.
+ **Breaking:** Remove previously exported internal `formatPath`.
+ Add `relative` path utility.

## 9.1
+ Add `trimBase` router path utility.
+ Add `basePath` option to history router.

## 9.0
+ **Breaking:** Using teardown hooks inside expressions now throws an error.
+ **Breaking:** `<For>` and `<IndexFor>` now also re-render when anything that is accessed during iteration is updated.
+ Add `nocapture` utility to explicitly un-support teardown hooks in specific contexts.
+ Add `trigger` parameter to `watch` and `watchUpdates`.
+ Add `effect` utility.

## 8.0
+ **Breaking:** Fix nested batch behavior: Updates during batches are now deferred until all current batches are complete.

## 7.1
+ Add `Signal.active` property.
+ Add `isTracking` utility.

## 7.0
+ **Breaking:** Rewrite route matching for ease of use and better tree shaking:
  + Support arbitrary iterable expressions as routes.
  + Custom route matchers must now return an object with normalized paths.

## 6.1
+ Add support for rendering document fragments.

## 6.0
+ **Breaking:** Async and router exports have been moved to `rvx/async` and `rvx/router`.
+ **Breaking:** Memos no longer run during batches.
+ **Breaking:** `trigger` argument has been removed from `watch` and `watchUpdates`.
+ **Breaking:** The following components have been renamed:
  + `<Show>` => `<Attach>`
  + `<When> => <Show>`
  + `<IterUnique> => <For>`
  + `<Iter> => <IndexFor>`
+ **Breaking:** The following functions have been removed:
  + `useUniqueId` - Use `uniqueId` or `<UseUniqueId>` instead.
  + `nest` - Use `<Nest>` instead.
  + `when` - Use `<Show>` instead.
  + `iterUnique` - Use `<For>` instead.
  + `iter` - Use `<IndexFor>` instead.
  + `show` - Use `<Attach>` instead.
+ Components are now also included in pre-bundled versions.
+ Fix broken query formatting in history and hash router.
+ Fix hash router listening to the wrong events.

## 5.7
+ Add `watchUpdates` utility.

## 5.6
+ Export `sharedGlobal` and `shareInstanceOf` utilities.

## 5.5
+ Add event API.

## 5.4
+ Add `Signal.pipe` utility.

## 5.3
+ Add `rvx/test` utilities.

## 5.2
+ Add `TaskSlot`.
+ Make all internal globals shared between different rvx versions in the same thread.
+ Make instances of `View` and `Signal` recognizable across different rvx versions.

## 5.1
+ The following APIs now cause unhandled rejections if an error isn't handled at all:
  + `waitFor(..)` and `Tasks.waitFor(..)`
  + `async(..)` and `<Async>` if there is no rejection callback and no `AsyncContext`.
  + `AsyncContext.track(..)` if the error wasn't handled by an `AsyncContext.complete(..)` call.

## 5.0
+ **Breaking:** Restore focus on the last active element by default when there are no more pending tasks.
+ **Breaking:** Rename `map/Map` to `iterUnique/IterUnique`.
+ **Breaking:** Remove `mapper` utility.
+ **Breaking:** Add `map` utility for mapping expression values.

## 4.1
+ Add watchable `pending` property to async contexts.

## 4.0
+ Add `Tasks.fork` utility.
+ Add `async` and `Async` for asynchronous rendering with a separate tracking system.
+ **Breaking:** Remove class based context keys.
+ **Breaking:** `inject` now requires a **key** and **value** instead of a **pair** argument.
+ **Breaking:** Renamed `ContextKeyFor` to `ContextKey`.
+ **Breaking:** Renamed `ContextValueFor` to `ContextValue`.
+ **Breaking:** Removed `unwrap` and `Unwrap`. Use `async/Async` instead.

## 3.2
+ Add `captureSelf` utility.

## 3.1
+ Add `watchFor` utility.

## 3.0
+ **Breaking:** Remove `jsx` argument from `createElement` and `setAttributes`.
+ JSX element type is now `unknown`.
+ Support legacy react jsx transform.
+ Notable internal changes, that most likely don't require migration:
  + Moved JSX runtime modules to `/dist/es/core/jsx/r17.{js,d.ts}`.
  + The React 17 JSX runtime now deletes the `children` property from the `prop` argument before creating an element.

## 2.4
+ Add `viewNodes` iterator.

## 2.3
+ Use hyphen cased style properties. (Exact behavior was previously unspecified)

## 2.2
+ Add manual pending tasks: `Tasks.setPending` and `setPending`.

## 2.1
+ Add expression mapping utilities: `mapper`, `string` and `optionalString`.

## 2.0
+ Add support for generic boolean attributes.
+ Add utility for phantom typed context key-value pairs.
+ Add value type to XMLNS context key.
+ Add value type to ROUTER context key.
+ Support arbitrarily nested arrays and expressions as class & style attribute values.
+ Fix missing key properties in jsx expressions.
+ **Breaking:** Drop support for css strings in style attributes.
+ **Breaking:** Remove `useNamespace` and `UseNamespace`. Use `inject` or `deriveContext` instead.
+ **Breaking:** Remove `useTasks` and `getTasks`. Use `inject` or `deriveContext` instead.
+ **Breaking:** Remove `rvx/router` exports. Use `rvx` instead.
+ **Breaking:** Remove `stylesheet` utility.
+ **Breaking:** Set all attributes except **class** and **style** as attributes by default. To set as properties, prefix attribute names with `prop:`.

## 1.3
+ Support context in expressions.
+ Add abort signal utilities.
+ Add pending task tracking.
+ Add unwrap utility.

## 1.2
+ Make router available from `rvx`.
+ **Deprecated:** Imports from `rvx/router`.

## 1.1
+ Add routing.
