# rvx/async
+ `AsyncContext` - Track async rendering.
  + `asyncCtx.track(promise)` - Track a promise to wait for.
  + `await asyncCtx.complete()` - Wait for rendering.
  + `AsyncContext.fork()` - Create a new child from the current context.
	+ `ASYNC` - A `Context` for `AsyncContext` instances.
+ `Queue` - A sequential async queue.
  + `await queue.block(task)` - Queue a blocking task, meant for user-triggered actions.
  + `queue.sideEffect(task)` - Queue a task caused by a side effect. E.g. caused by automatic validation. Aborted when anything else is queued.
+ `Tasks` - Meant for tracking tasks that block user interaction in a context.
  + `tasks.pending` / `tasks.selfPending` - Check pending tasks. Use to e.g. automatically disable user inputs.
  + `tasks.setPending()` - Mark pending for the current lifecycle.
  + `tasks.waitFor(source)` - Track a promise or an async function.
  + `Tasks.fork(options?)` - Create a new child from the current context.
	+ `TASKS` - A `Context` for `Tasks` instances.
	+ `isPending()` / `isSelfPending()` - Equivalent to e.g. `TASKS.current?.pending` / `?.selfPending`.
+ `useAbortController(reason?)` / `useAbortSignal(reason?)` - Create an abort controller/signal that aborts when the current lifecycle is disposed.
+ `useMicrotask(callback)` / `useTimeout(callback, timeout)` / `useInterval(callback, interval)` / `useAnimation(callback)` - Lifecycle-aware timers.
+ `await watchFor(expr, timeout?)` - Watch an expression until it returns a truthy result. Returns the expression result.
+ `await watchFor(expr, condition, timeout?)` - Watch an expression until its result matches a condition. Returns the expression result.

### JSX
+ `<Async source={promise} pending={component} rejected={error => content}>{value => content}</Async>` - Render depending on a static promise. Combine with `<Nest>` if the promise originates from an expression.

### No Build
+ `nestAsync(source, contentComponent?, pendingComponent?, rejectedComponent?)` - Same as `<Async>`.
