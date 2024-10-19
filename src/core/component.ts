
/**
 * Common interface for components.
 */
export interface Component<Props = void, Content = unknown> {
	(props: Props): Content;
}
