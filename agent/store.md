# rvx/store
+ `wrap(value)` - Get a deep reactive wrapper.
	+ Plain objects - `createReactiveProxy`.
	+ Arrays - `createReactiveArrayProxy`.
	+ `Map`s & `Set`s - `ReactiveMap`/`ReactiveSet`.
	+ Other values are returned as is unless their class was registered with `wrapInstancesOf`.
+ `unwrap(value)` - Get the original target that was wrapped.
	+ Returns the value as is if this is not a wrapper.
+ `wrapInstancesOf(targetClass, wrap?)` - Specify how to wrap an instance of the target class.
	+ This should be called from a class's static block: `static { wrapInstancesOf(this, ...) }`
	+ `wrapInstancesOf(this)` - Wrap using `createReactiveProxy`.
	+ `wrapInstancesOf(this, instance => wrapper)` - Wrap using a custom function.
+ A "barrier" is an object with a `wrap` and `unwrap` method for converting between wrappers and target objects.
	+ `BARRIER` - The default barrier using `wrap` and `unwrap`.
+ `createReactiveProxy(target, barrier)` - Create a reactive proxy for an arbitrary object.
+ `createReactiveArrayProxy(target, barrier)` - Create a reactive proxy for an array.
+ `ReactiveMap` / `ReactiveSet` - Reactive variants of `Map`/`Set`.
+ `reflect(target, key)` - Create a signal that reflects a property of the target object.
	+ This requires a lifecycle and the signal/target is no longer updated when disposed.
+ `ProbeMap` / `ProbeSignal` - Utility for tracking keyed accesses to values that may or may not exist.
