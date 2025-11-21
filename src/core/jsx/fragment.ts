import { Content } from "../types.js";

/**
 * The jsx fragment component that returns it's children as is.
 */
export function Fragment(props: { children?: Content }): Content {
	return props.children;
}
