# rvx/test
+ `runTest(fn)` - Run a synchronous test with a lifecycle that is disposed after the test.
+ `await runAsyncTest(ctx => ...)` - Run an async test.
	+ `ctx.asyncCtx` - An `AsyncContext` used during this test.
	+ `ctx.use(fn)` - Run within the async context.
		+ Teardown hooks are disposed after the async test finishes.
+ `await poll(fn, timeout?)` - Wait for a function to return a truthy result by polling at most every event cycle. Returns the first truthy result.
+ `await exclusive(key, action)` - Run an exclusive action on a `Queue` for the specified key.
	+ E.g. `exclusive("focus", async () => { someElement.focus(); ... });`
+ `assertViewState(view)` - Throw if a `View` is in an invalid state.
+ `querySelector(view, selector)` / `querySelectorAll(view, selector)` - Like `document.querySelector/querySelectorAll` but for `View`s.
