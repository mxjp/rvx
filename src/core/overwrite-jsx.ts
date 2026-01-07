import type { ElementBuilder } from "./element-builder.js";
import { Attributes, NODE, NodeTarget } from "./element-common.js";
import { applyElement } from "./jsx/common.js";

/**
 * Utility for modifying an existing element or {@link ElementBuilder element builder} returned from a component.
 *
 * + Event listeners and the _ref_ attribute are additive.
 * + Unique styles, classes, attributes and properties and additive.
 * + **Styles, classes, attributes and properties that are already set by the component may cause conflicts.**
 *
 * @example
 * ```tsx
 * <Overwrite class="some-class">
 *   <SomeComponent />
 * </Overwrite>
 * ```
 */
export function Overwrite<E extends Element>(props: { children: unknown } & Attributes<E>): unknown {
	const { children } = props as { children: NodeTarget<Element> | Element };
	delete props.children;
	applyElement<Element>(NODE in children ? children[NODE] : children, props as Attributes<Element>);
	return children;
}
