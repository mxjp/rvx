
/**
 * The jsx fragment component that returns it's children as is.
 */
export function Fragment(props: { children?: unknown }): unknown {
	return props.children;
}
