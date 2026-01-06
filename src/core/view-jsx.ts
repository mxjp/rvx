import { Expression, ExpressionResult } from "./signals.js";
import { Component, Content, Falsy } from "./types.js";
import { attachWhen, ForContentFn, forEach, IndexContentFn, indexEach, nest, View, when } from "./view.js";

/**
 * Watch an expression and render content from it's result.
 *
 * + If an error is thrown during initialization, the error is re-thrown.
 * + If an error is thrown during a signal update, the previously rendered content is kept in place and the error is re-thrown.
 * + Content returned from the component can be directly reused within the same `<Nest>` instance.
 *
 * See {@link nest} when not using JSX.
 *
 * @example
 * ```tsx
 * import { $, Nest } from "rvx";
 *
 * const count = $(0);
 *
 * <Nest watch={count}>
 *   {count => {
 *     switch (count) {
 *       case 0: return <h1>Hello World!</h1>;
 *       case 1: return "Something else...";
 *     }
 *   }}
 * </Nest>
 * ```
 */
export function Nest<T>(props: {
	/**
	 * The expression to watch.
	 */
	watch: T;

	/**
	 * The component to render with the expression result.
	 *
	 * If the expression returns a component, null or undefined, this can be omitted.
	 */
	children: Component<ExpressionResult<T>>;
} | {
	/**
	 * The expression to watch.
	 */
	watch: Expression<Component | null | undefined>;
}): View {
	return nest(props.watch, (props as any).children);
}

/**
 * Render conditional content.
 *
 * + Content is only re-rendered if the expression result is not strictly equal to the previous one. If this behavior is undesired, use {@link Nest} instead.
 * + If an error is thrown by the expression or component during initialization, the error is re-thrown.
 * + If an error is thrown by the expression or component during a signal update, the previously rendered content is kept and the error is re-thrown.
 *
 * See {@link when} when not using JSX.
 *
 * @example
 * ```tsx
 * import { $, Show } from "rvx";
 *
 * const message = $<null | string>("Hello World!");
 *
 * <Show when={message} else={() => <>No message...</>}>
 *   {value => <h1>{value}</h1>}
 * </Show>
 * ```
 */
export function Show<T>(props: {
	/**
	 * The condition to watch.
	 */
	when: Expression<T | Falsy>;

	/**
	 * The component to render when the condition result is truthy.
	 */
	children: Component<T>;

	/**
	 * An optional component to render when the condition result is falsy.
	 */
	else?: Component;
}): View {
	return when(props.when, props.children, props.else);
}

/**
 * Render content for each unique value in an iterable.
 *
 * If an error is thrown while iterating or while rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.
 *
 * See {@link forEach} when not using JSX.
 *
 * @example
 * ```tsx
 * import { $, For } from "rvx";
 *
 * const items = $([1, 2, 3]);
 *
 * <For each={items}>
 *   {value => <li>{value}</li>}
 * </For>
 * ```
 */
export function For<T>(props: {
	/**
	 * The expression to watch. Note, that signals accessed during iteration will also trigger updates.
	 */
	each: Expression<Iterable<T>>;

	/**
	 * The component to render for each unique value.
	 */
	children: ForContentFn<T>;
}): View {
	return forEach(props.each, props.children);
}

/**
 * Render content for each value in an iterable, keyed by index and value.
 *
 * If an error is thrown by iterating or by rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.
 *
 * See {@link indexEach} when not using JSX.
 *
 * @example
 * ```tsx
 * import { $, Index } from "rvx";
 *
 * const items = $([1, 2, 3]);
 *
 * <Index each={items}>
 *   {value => <li>{value}</li>}
 * </Index>
 * ```
 */
export function Index<T>(props: {
	/**
	 * The expression to watch..
	 *
	 * Note, that signals accessed during iteration will also trigger updates.
	 */
	each: Expression<Iterable<T>>;

	/**
	 * The component to render for each value/index pair.
	 */
	children: IndexContentFn<T>;
}): View {
	return indexEach(props.each, props.children);
}

/**
 * Attach or detach content depending on an expression.
 *
 * Content is kept alive when detached.
 *
 * See {@link attachWhen} when not using JSX.
 *
 * @example
 * ```tsx
 * import { $, Attach } from "rvx";
 *
 * const showMessage = $(true);
 *
 * <Attach when={showMessage}>
 *   <h1>Hello World!</h1>
 * </Attach>
 * ```
 */
export function Attach(props: {
	/**
	 * The condition to watch.
	 */
	when: Expression<boolean>;

	/**
	 * The content to attach when the condition result is truthy.
	 */
	children?: Content;
}): View {
	return attachWhen(props.when, props.children);
}
