import { NODE, NodeTarget } from "./element-common.js";
import { createParent, createPlaceholder, createText } from "./internals.js";
import { teardown } from "./lifecycle.js";
import { View, ViewSetBoundaryFn } from "./view.js";

/**
 * Internal shorthand for creating the boundary comment of an empty view.
 */
function empty(setBoundary: ViewSetBoundaryFn): void {
	const node = createPlaceholder();
	setBoundary(node, node);
}

/**
 * Internal shorthand for using the children of a node as boundary.
 */
function use(setBoundary: ViewSetBoundaryFn, node: Node): void {
	if (node.firstChild === null) {
		empty(setBoundary);
	} else {
		setBoundary(node.firstChild, node.lastChild!);
	}
}

/**
 * Render arbitrary content.
 *
 * Supported content types are:
 * + Null and undefined (not displayed).
 * + Arbitrarily nested arrays/fragments of content.
 * + DOM nodes. Children will be removed from document fragments.
 * + {@link View Views}.
 * + Anything created with rvx's jsx runtime.
 * + Anything else is displayed as text.
 *
 * @param content The content to render.
 * @returns A view instance or the content itself if it's already a view.
 *
 * @example
 * ```tsx
 * import { render, sig } from "rvx";
 *
 * // Not displayed:
 * render(null);
 * render(undefined);
 *
 * // Arbitrarily nested arrays/fragments of content:
 * render([["Hello"], " World!"]);
 * render(<>{<>"Hello"</>}{" World!"}</>);
 *
 * // DOM nodes:
 * render(<h1>Hello World!</h1>);
 * render(document.createElement("input"));
 * render(document.createTextNode("Hello World!"));
 * render(someTemplate.content.cloneNode(true));
 *
 * // Views:
 * render(render("Hello World!"));
 * render(when(true, () => "Hello World!"));
 * render(<When value={true}>{() => "Hello World!"}</When>);
 *
 * // Text:
 * render("Hello World!");
 * render(() => "Hello World!");
 * render(42);
 * render(sig(42));
 * ```
 */
export function render(content: unknown): View {
	if (content instanceof View) {
		return content;
	}
	return new View(setBoundary => {
		if (Array.isArray(content)) {
			const flat = content.flat(Infinity) as unknown[];
			if (flat.length > 1) {
				const parent = createParent();
				for (let i = 0; i < flat.length; i++) {
					let part = flat[i];
					if (part === null || part === undefined) {
						parent.appendChild(createPlaceholder());
					} else if (typeof part === "object") {
						if (NODE in part) {
							part = (part as NodeTarget)[NODE];
						}
						if (part instanceof Node) {
							if (part.nodeName === "#document-fragment" && part.childNodes.length === 0) {
								parent.appendChild(createPlaceholder());
							} else {
								parent.appendChild(part);
							}
						} else if (part instanceof View) {
							parent.appendChild(part.take());
							if (i === 0) {
								part.setBoundaryOwner((first, _last) => setBoundary(first, undefined));
							} else if (i === flat.length - 1) {
								part.setBoundaryOwner((_first, last) => setBoundary(undefined, last));
							}
						} else {
							parent.appendChild(createText(part));
						}
					} else {
						parent.appendChild(createText(part));
					}
				}
				use(setBoundary, parent);
				return;
			}
			content = flat[0];
		}
		if (content === null || content === undefined) {
			empty(setBoundary);
		} else if (typeof content === "object") {
			if (NODE in content) {
				content = (content as NodeTarget)[NODE];
			}
			if (content instanceof Node) {
				if (content.nodeName === "#document-fragment") {
					use(setBoundary, content);
				} else {
					setBoundary(content, content);
				}
			} else if (content instanceof View) {
				setBoundary(content.first, content.last);
				content.setBoundaryOwner(setBoundary);
			} else {
				const text = createText(content);
				setBoundary(text, text);
			}
		} else {
			const text = createText(content);
			setBoundary(text, text);
		}
	});
}

/**
 * Render arbitrary content and append it to the specified parent until the current lifecycle is disposed.
 *
 * @param parent The parent node.
 * @param content The content to render. See {@link render} for supported types.
 * @returns The view instance.
 *
 * @example
 * ```tsx
 * import { mount } from "rvx";
 *
 * mount(
 *   document.body,
 *   <h1>Hello World!</h1>
 * );
 * ```
 *
 * Since the content is removed when the current lifecycle is disposed, this can also be used to temporarily append
 * content to different elements while some component is rendered:
 * ```tsx
 * import { mount } from "rvx";
 *
 * function Popover(props: { text: unknown, children: unknown }) {
 *   const visible = sig(false);
 *
 *   mount(
 *     document.body,
 *     <Show when={visible}>
 *       {props.children}
 *     </Show>
 *   );
 *
 *   return <button on:click={() => { visible.value = !visible.value; }}>
 *     {props.text}
 *   </button>;
 * }
 *
 * mount(
 *   document.body,
 *   <Popover text="Click me!">
 *     Hello World!
 *   </Popover>
 * );
 * ```
 */
export function mount(parent: Node, content: unknown): View {
	const view = render(content);
	parent.appendChild(view.take());
	teardown(() => view.detach());
	return view;
}
