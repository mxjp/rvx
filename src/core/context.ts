
/**
 * The value type for a specific type of key.
 */
export type ContextValueFor<K> = K extends (new(...args: any) => infer T) ? T : unknown;

/**
 * A key value pair or instance for a specific type of key.
 */
export type ContextPairFor<K> = [K, ContextValueFor<K>] | (K extends (new(...args: any) => infer V) ? V : never);

/**
 * Interface for a context that should not be modified.
 *
 * Note that this is always a {@link Map} instance.
 */
export interface ReadonlyContext {
	get<K>(key: K): ContextValueFor<K> | undefined;
	has(key: unknown): boolean;
	readonly size: number;
}

/**
 * Interface for a context that may be modified.
 *
 * Note that this is always a {@link Map} instance.
 */
export interface Context extends ReadonlyContext {
	clear(): void;
	delete(key: unknown): boolean;
	set<K>(key: K, value: ContextValueFor<K>): void;
}

/**
 * Internal stack where the last item is the current context.
 */
const CONTEXT_STACK: (ReadonlyContext | undefined)[] = [];

/**
 * Get the current context.
 *
 * @returns The current context or undefined if there is no context.
 */
export function getContext(): ReadonlyContext | undefined {
	return CONTEXT_STACK[CONTEXT_STACK.length - 1];
}

/**
 * Get a value from the current context.
 *
 * @param key The key to find.
 * @returns The value or undefined if not found.
 */
export function extract<K>(key: K): ContextValueFor<K> | undefined {
	return getContext()?.get(key);
}

/**
 * Run a function within a copy of the current context that also contains an additional entry.
 *
 * For injecting multiple entries prefer using {@link deriveContext}.
 *
 * @param value The key value pair or instance to inject.
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function inject<K, R>(value: ContextPairFor<K>, fn: () => R): R {
	const context = new Map(getContext() as Map<any, any>) as Context;

	if (Array.isArray(value)) {
		context.set(value[0], value[1]);
	} else {
		const constructor = (value as any).constructor;
		if (typeof constructor !== "function") {
			throw new TypeError("value must have a constructor");
		}
		context.set(constructor, value);
	}
	return runInContext(context, fn);
}

/**
 * Run a function within a copy of the current context.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function deriveContext<R>(fn: (context: Context) => R): R {
	const context = new Map(getContext() as Map<any, any>) as Context;
	return runInContext(context, () => fn(context));
}

/**
 * Run a function within the specified or without a context.
 *
 * @param context The context or undefined to use no context.
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function runInContext<R>(context: ReadonlyContext | undefined, fn: () => R): R {
	CONTEXT_STACK.push(context);
	try {
		return fn();
	} finally {
		CONTEXT_STACK.pop();
	}
}