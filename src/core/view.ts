import { Component } from "./component.js";
import { ENV } from "./env.js";
import { createParent, createPlaceholder, Falsy, NOOP } from "./internals.js";
import { capture, nocapture, teardown, TeardownHook } from "./lifecycle.js";
import { render } from "./render.js";
import { $, effect, Expression, ExpressionResult, get, memo, Signal, watch } from "./signals.js";

/**
 * A function that is called when the view boundary may have been changed.
 */
export interface ViewBoundaryOwner {
	/**
	 * @param first The current first node.
	 * @param last The current last node.
	 */
	(first: Node, last: Node): void;
}

/**
 * A function that must be called after the view boundary has been changed.
 */
export interface ViewSetBoundaryFn {
	/**
	 * @param first The first node if changed.
	 * @param last The last node if changed.
	 */
	(first: Node | undefined, last: Node | undefined): void;
}

interface UninitViewProps {
	/**
	 * The current first node of this view.
	 *
	 * + This may be undefined while the view is not fully initialized.
	 * + This property is not reactive.
	 */
	get first(): Node | undefined;

	/**
	 * The current last node of this view.
	 *
	 * + This may be undefined while the view is not fully initialized.
	 * + This property is not reactive.
	 */
	get last(): Node | undefined;
}

export type UninitView = UninitViewProps & Omit<View, keyof UninitViewProps>;

/**
 * A function that is called once to initialize a view instance.
 *
 * View creation will fail if no first or last node has been set during initialization.
 */
export interface ViewInitFn {
	/**
	 * @param setBoundary A function that must be called after the view boundary has been changed.
	 * @param self The current view itself. This can be used to keep track of the current boundary and parent nodes.
	 */
	(setBoundary: ViewSetBoundaryFn, self: UninitView): void;
}

/**
 * Represents a sequence of at least one DOM node.
 *
 * Consumers of the view API need to guarantee that:
 * + The sequence of nodes is not modified from the outside.
 * + If there are multiple nodes, all nodes must have a common parent node at all time.
 */
export class View {
	#first!: Node;
	#last!: Node;
	#owner: ViewBoundaryOwner | undefined;

	/**
	 * Create a new view.
	 *
	 * View implementations need to guarantee that:
	 * + The view doesn't break when the parent node is replaced or when a view consisting of only a single node is detached from it's parent.
	 * + The boundary is updated immediately after the first or last node has been updated.
	 * + If there are multiple nodes, all nodes remain in the current parent.
	 * + If there are multiple nodes, the initial nodes must have a common parent.
	 */
	constructor(init: ViewInitFn) {
		init((first, last) => {
			if (first) {
				this.#first = first;
			}
			if (last) {
				this.#last = last;
			}
			this.#owner?.(this.#first, this.#last);
		}, this);
		if (!this.#first || !this.#last) {
			// View boundary was not completely initialized:
			throw new Error("G1");
		}
	}

	/**
	 * The current first node of this view.
	 *
	 * Note, that this property is not reactive.
	 */
	get first(): Node {
		return this.#first;
	}

	/**
	 * The current last node of this view.
	 *
	 * Note, that this property is not reactive.
	 */
	get last(): Node {
		return this.#last;
	}

	/**
	 * The current parent node or undefined if there is none.
	 *
	 * Note, that this property is not reactive.
	 */
	get parent(): Node | undefined {
		return this.#first?.parentNode ?? undefined;
	}

	/**
	 * Set the boundary owner for this view until the current lifecycle is disposed.
	 *
	 * @throws An error if there currently is a boundary owner.
	 */
	setBoundaryOwner(owner: ViewBoundaryOwner): void {
		if (this.#owner !== undefined) {
			// View already has a boundary owner:
			throw new Error("G2");
		}
		this.#owner = owner;
		teardown(() => this.#owner = undefined);
	}

	/**
	 * Append all nodes of this view to the specified parent.
	 *
	 * @param parent The parent to append to.
	 */
	appendTo(parent: Node): void {
		let node = this.#first;
		const last = this.#last;
		for (;;) {
			const next = node.nextSibling;
			parent.appendChild(node);
			if (node === last) {
				break;
			}
			node = next!;
		}
	}

	/**
	 * Insert all nodes of this view before a reference child of the specified parent.
	 *
	 * @param parent The parent to insert into.
	 * @param ref The reference child to insert before. If this is null, the nodes are appended to the parent.
	 */
	insertBefore(parent: Node, ref: Node | null): void {
		if (ref === null) {
			return this.appendTo(parent);
		}
		let node = this.#first;
		const last = this.#last;
		for (;;) {
			const next = node.nextSibling;
			parent.insertBefore(node, ref);
			if (node === last) {
				break;
			}
			node = next!;
		}
	}

	/**
	 * Detach all nodes of this view from the current parent if there is one.
	 *
	 * If there are multiple nodes, they are moved into a new document fragment to allow the view implementation to stay alive.
	 *
	 * @returns The single removed node or the document fragment they have been moved into.
	 */
	detach(): Node | DocumentFragment {
		const first = this.#first;
		const last = this.#last;
		if (first === last) {
			first.parentNode?.removeChild(first);
			return first;
		} else {
			const fragment = ENV.current.document.createDocumentFragment();
			this.appendTo(fragment);
			return fragment;
		}
	}
}

/**
 * Get an iterator over all current top level nodes of a view.
 *
 * @param view The view.
 * @returns The iterator.
 *
 * @example
 * ```tsx
 * import { render, viewNodes } from "rvx";
 *
 * const view = render(<>
 *   <h1>Hello World!</h1>
 * </>);
 *
 * for (const node of viewNodes(view)) {
 *   console.log(node);
 * }
 * ```
 */
export function * viewNodes(view: View): IterableIterator<Node> {
	let node = view.first;
	for (;;) {
		yield node;
		if (node === view.last) {
			break;
		}
		node = node.nextSibling!;
	}
}

const _nestDefault = ((component: Component | null | undefined) => component?.()) as Component<unknown>;

/**
 * Watch an expression and render content from it's result.
 *
 * + If an error is thrown during initialization, the error is re-thrown.
 * + If an error is thrown during a signal update, the previously rendered content is kept in place and the error is re-thrown.
 * + Content returned from the component can be directly reused within the same `nest` instance.
 *
 * See {@link Nest `<Nest>`} when using JSX.
 *
 * @param expr The expression to watch.
 * @param component The component to render with the expression result. If the expression returns a component, null or undefined, this can be omitted.
 *
 * @example
 * ```tsx
 * import { $, nest, e } from "rvx";
 *
 * const count = $(0);
 *
 * nest(count, count => {
 *   switch (count) {
 *     case 0: return e("h1").append("Hello World!");
 *     case 1: return "Something else...";
 *   }
 * })
 * ```
 */
export function nest(expr: Expression<Component | null | undefined>): View;
export function nest<T>(expr: Expression<T>, component: Component<T>): View;
export function nest(expr: Expression<unknown>, component: Component<unknown> = _nestDefault): View {
	return new View((setBoundary, self) => {
		watch(expr, value => {
			const last: Node | undefined = self.last;
			const parent = last?.parentNode;
			let view: View;
			if (parent) {
				const anchor = last.nextSibling;
				self.detach();
				view = render(component(value));
				view.insertBefore(parent, anchor);
			} else {
				view = render(component(value));
			}
			setBoundary(view.first, view.last);
			view.setBoundaryOwner(setBoundary);
		});
	});
}

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
 * + Content is only re-rendered if the expression result is not strictly equal to the previous one. If this behavior is undesired, use {@link nest} instead.
 * + If an error is thrown by the expression or component during initialization, the error is re-thrown.
 * + If an error is thrown by the expression or component during a signal update, the previously rendered content is kept and the error is re-thrown.
 *
 * See {@link Show `<Show>`} when using JSX.
 *
 * @param condition The condition to watch.
 * @param truthy The component to render when the condition result is truthy.
 * @param falsy An optional component to render when the condition is falsy.
 *
 * @example
 * ```tsx
 * import { $, when, e } from "rvx";
 *
 * const message = $<null | string>("Hello World!");
 *
 * when(message, value => e("h1").append(value), () => "No message...")
 * ```
 */
export function when<T>(condition: Expression<T | Falsy>, truthy: Component<T>, falsy?: Component): View {
	return nest(memo(condition), value => value ? truthy(value) : falsy?.());
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

export interface ForContentFn<T> {
	/**
	 * @param value The value.
	 * @param index An expression to get the current index.
	 * @returns The content.
	 */
	(value: T, index: () => number): unknown;
}

/**
 * Render content for each unique value in an iterable.
 *
 * If an error is thrown while iterating or while rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.
 *
 * See {@link For `<For>`} for use with JSX.
 *
 * @param each The expression to watch. Note, that signals accessed during iteration will also trigger updates.
 * @param component The component to render for each unique value.
 *
 * @example
 * ```tsx
 * import { $, forEach, e } from "rvx";
 *
 * const items = $([1, 2, 3]);
 *
 * forEach(items, value => e("li").append(value))
 * ```
 */
export function forEach<T>(each: Expression<Iterable<T>>, component: ForContentFn<T>): View {
	return new View((setBoundary, self) => {
		interface Instance {
			/** value */
			u: T;
			/** cycle */
			c: number;
			/** index */
			i: Signal<number>;
			/** dispose */
			d: TeardownHook;
			/** view */
			v: View;
		}

		function detach(instances: Instance[]) {
			for (let i = 0; i < instances.length; i++) {
				instances[i].v.detach();
			}
		}

		const env = ENV.current;
		let cycle = 0;

		const instances: Instance[] = [];
		const instanceMap = new Map<T, Instance>();

		const first: Node = createPlaceholder(env);
		setBoundary(first, first);

		teardown(() => {
			for (let i = 0; i < instances.length; i++) {
				instances[i].d();
			}
		});

		effect(() => {
			let parent = self.parent;
			if (!parent) {
				parent = createParent(env);
				parent.appendChild(first);
			}
			let index = 0;
			let last = first;
			try {
				for (const value of nocapture(() => get(each))) {
					let instance: Instance | undefined = instances[index];
					if (instance && Object.is(instance.u, value)) {
						instance.c = cycle;
						instance.i.value = index;
						last = instance.v.last;
						index++;
					} else {
						instance = instanceMap.get(value);
						if (instance === undefined) {
							const instance: Instance = {
								u: value,
								c: cycle,
								i: $(index),
								d: undefined!,
								v: undefined!,
							};

							instance.d = capture(() => {
								instance.v = render(component(value, () => instance.i.value));
								instance.v.setBoundaryOwner((_, last) => {
									if (instances[instances.length - 1] === instance && instance.c === cycle) {
										setBoundary(undefined, last);
									}
								});
							});

							instance.v.insertBefore(parent, last.nextSibling);
							instances.splice(index, 0, instance);
							instanceMap.set(value, instance);
							last = instance.v.last;
							index++;
						} else if (instance.c !== cycle) {
							instance.i.value = index;
							instance.c = cycle;

							const currentIndex = instances.indexOf(instance, index);
							if (currentIndex < 0) {
								detach(instances.splice(index, instances.length - index, instance));
								instance.v.insertBefore(parent, last.nextSibling);
							} else {
								detach(instances.splice(index, currentIndex - index));
							}

							last = instance.v.last;
							index++;
						}
					}
				}
			} finally {
				if (instances.length > index) {
					detach(instances.splice(index));
				}
				for (const [value, instance] of instanceMap) {
					if (instance.c !== cycle) {
						instanceMap.delete(value);
						instance.v.detach();
						instance.d();
					}
				}
				cycle = (cycle + 1) | 0;
				setBoundary(undefined, last);
			}
		});
	});
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

export interface IndexContentFn<T> {
	/**
	 * @param value The value.
	 * @param index The index.
	 * @returns The content.
	 */
	(value: T, index: number): unknown;
}

/**
 * @deprecated Use {@link IndexContentFn} instead.
 */
export type IndexForContentFn<T> = IndexContentFn<T>;

/**
 * Render content for each value in an iterable, keyed by index and value.
 *
 * If an error is thrown by iterating or by rendering an item, the update is stopped as if the previous item was the last one and the error is re-thrown.
 *
 * See {@link Index `<Index>`} when using JSX.
 *
 * @param each The expression to watch. Note, that signals accessed during iteration will also trigger updates.
 * @param component The component to render for each value/index pair.
 *
 * @example
 * ```tsx
 * import { $, indexEach, e } from "rvx";
 *
 * const items = $([1, 2, 3]);
 *
 * indexEach(items, value => e("li").append(value))
 * ```
 */
export function indexEach<T>(each: Expression<Iterable<T>>, component: IndexContentFn<T>): View {
	return new View((setBoundary, self) => {
		interface Instance {
			/** value */
			u: T;
			/** dispose */
			d: TeardownHook;
			/** view */
			v: View;
		}

		const env = ENV.current;
		const first: Node = createPlaceholder(env);
		setBoundary(first, first);

		const instances: Instance[] = [];
		teardown(() => {
			for (let i = 0; i < instances.length; i++) {
				instances[i].d();
			}
		});

		effect(() => {
			let parent = self.parent;
			if (!parent) {
				parent = createParent(env);
				parent.appendChild(first);
			}
			let index = 0;
			let last = first;
			try {
				for (const value of nocapture(() => get(each))) {
					if (index < instances.length) {
						const current = instances[index];
						if (Object.is(current.u, value)) {
							last = current.v.last;
							index++;
							continue;
						}
						current.v.detach();
						current.d();
						current.d = NOOP;
					}

					const instance: Instance = {
						u: value,
						d: undefined!,
						v: undefined!,
					};

					instance.d = capture(() => {
						instance.v = render(component(value, index));
						instance.v.setBoundaryOwner((_, last) => {
							if (instances[instances.length - 1] === instance) {
								setBoundary(undefined, last);
							}
						});
					});

					instance.v.insertBefore(parent, last.nextSibling);
					instances[index] = instance;
					last = instance.v.last;
					index++;
				}
			} finally {
				if (instances.length > index) {
					for (let i = index; i < instances.length; i++) {
						const instance = instances[i];
						instance.v.detach();
						instance.d();
					}
					instances.length = index;
				}
				setBoundary(undefined, last);
			}
		});
	});
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
 * @deprecated. Use {@link Index} instead.
 */
export const IndexFor = Index;

/**
 * A wrapper that can be used for moving and reusing views.
 */
export class MovableView {
	#env = ENV.current;
	#view: View;
	#dispose?: TeardownHook = undefined;

	constructor(view: View) {
		this.#view = view;
	}

	/**
	 * Create a new view that contains the wrapped view until it is moved again or detached.
	 */
	move: Component<void, View> = () => {
		return new View((setBoundary, self) => {
			this.#dispose?.();
			this.#dispose = capture(() => {
				setBoundary(this.#view.first, this.#view.last);
				this.#view.setBoundaryOwner(setBoundary);
				teardown(() => {
					const anchor = createPlaceholder(this.#env);
					self.parent?.insertBefore(anchor, self.first!);
					self.detach();
					setBoundary(anchor, anchor);
				});
			});
		});
	};

	/**
	 * Detach the wrapped view if attached.
	 */
	detach(): void {
		this.#dispose?.();
		this.#dispose = undefined;
	}
}

/**
 * Render and wrap arbitrary content so that it can be moved and reused.
 */
export function movable(content: unknown): MovableView {
	return new MovableView(render(content));
}

/**
 * Attach or detach content depending on an expression.
 *
 * Content is kept alive when detached.
 *
 * See {@link Attach `<Attach>`} when using JSX.
 *
 * @param condition The condition to watch.
 * @param content The content to attach when the condition result is truthy.
 *
 * @example
 * ```tsx
 * import { $, attach } from "rvx";
 *
 * const showMessage = $(true);
 *
 * attachWhen(showMessage, e("h1").append("Hello World!"))
 * ```
 */
export function attachWhen(condition: Expression<boolean>, content: unknown): View {
	return nest(condition, value => value ? content : undefined);
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
	children?: unknown;
}): View {
	return attachWhen(props.when, props.children);
}
