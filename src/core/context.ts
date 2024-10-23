import { Component } from "./component.js";
import { CONTEXT_STACK } from "./internals.js";
import { useStack } from "./internals.js";

/**
 * Utility for defining phantom typed context key-value pairs.
 *
 * @example
 * ```ts
 * import { ContextKey } from "rvx";
 *
 * const key = Symbol("example") as SymbolFor<"exampleValue">;
 *
 * inject(key, "exampleValue", () => {
 *   const value = extract(key); // type = "exampleValue"
 * });
 * ```
 */
export type ContextKey<V> = symbol & { PHANTOM_CONTEXT_KEY_FOR: V & never };

/**
 * The value type for a specific type of key.
 */
export type ContextValue<K> = K extends ContextKey<infer V> ? V : unknown;

/**
 * Interface for a context that should not be modified.
 *
 * Note that this is always a {@link Map} instance.
 */
export interface ReadonlyContext {
	get<K>(key: K): ContextValue<K> | undefined;
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
	set<K>(key: K, value: ContextValue<K> | undefined): void;
}

/**
 * Create a new empty context.
 */
export function createContext(): Context {
	return new Map();
}

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
export function extract<K>(key: K): ContextValue<K> | undefined {
	return getContext()?.get(key);
}

/**
 * Run a function within a copy of the current context that also contains an additional entry.
 *
 * + For injecting multiple entries prefer using {@link deriveContext}.
 *
 * @param value The key value pair or instance to inject.
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function inject<K, R>(key: K, value: ContextValue<K> | undefined, fn: () => R): R {
	const context = new Map(getContext() as Map<any, any>) as Context;
	context.set(key, value);
	return runInContext(context, fn);
}

/**
 * Inject an entry.
 *
 * @example
 * ```tsx
 * import { Inject, extract } from "rvx";
 *
 * <Inject key="message" value="Hello World!">
 *   {() => <h1>{extract("message")}</h1>}
 * </Inject>
 * ```
 */
export function Inject<K>(props: {
	key: K;
	value: ContextValue<K> | undefined;
	children: Component;
}): unknown {
	return inject(props.key, props.value, props.children);
}

/**
 * Run a function within a copy of the current context.
 *
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function deriveContext<R>(fn: (context: Context, parent?: ReadonlyContext) => R): R {
	const parent = getContext() as Map<any, any>;
	const context = new Map(parent) as Context;
	return runInContext(context, () => fn(context, parent));
}

/**
 * Render content with a copy of the current context.
 *
 * @example
 * ```tsx
 * import { DeriveContext, extract } from "rvx";
 *
 * <DeriveContext>
 *   {context => {
 *     context.set("message", "Hello World!");
 *     return <h1>{extract("message")}</h1>;
 *   }}
 * </DeriveContext>
 * ```
 */
export function DeriveContext(props: {
	/**
	 * A function to render content.
	 */
	children: (context: Context, parent?: ReadonlyContext) => unknown;
}): unknown {
	return deriveContext(props.children);
}

/**
 * Run a function within the specified or without a context.
 *
 * @param context The context or undefined to use no context.
 * @param fn The function to run.
 * @returns The function's return value.
 */
export function runInContext<R>(context: ReadonlyContext | undefined, fn: () => R): R {
	return useStack(CONTEXT_STACK, context, fn);
}

/**
 * Wrap a function to be run with the current context.
 *
 * @param fn The function to wrap.
 * @returns The wrapper.
 */
export function wrapContext<T extends (...args: any) => any>(fn: T): T {
	const context = getContext();
	return ((...args: unknown[]) => {
		CONTEXT_STACK.push(context);
		try {
			return fn(...args) as T;
		} finally {
			CONTEXT_STACK.pop();
		}
	}) as T;
}
