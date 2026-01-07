import { ElementBuilder } from "./element-builder.js";
import { NODE, NodeTarget } from "./element-common.js";

/**
 * Utility for modifying an existing element or {@link ElementBuilder element builder} returned from a component.
 *
 * + Event listeners are additive.
 * + Unique styles, classes, attributes and properties and additive.
 * + **Styles, classes, attributes and properties that are already set by the component may cause conflicts.**
 *
 * @example
 * ```tsx
 * overwrite(
 *   SomeComponent(...)
 * ).class("some-class")
 * ```
 */
export function overwrite<E extends Element>(target: E | NodeTarget<E>): ElementBuilder<E> {
	return new ElementBuilder(NODE in target ? target[NODE] : target);
}
