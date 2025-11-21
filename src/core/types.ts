
/**
 * Utility type for any falsy value.
 */
export type Falsy = null | undefined | false | 0 | 0n | "";

/**
 * Type alias for `unknown` to indicate rendered content.
 */
export type Content = unknown;

/**
 * Common interface for components.
 */
export interface Component<TProps = void, TContent = Content> {
	(props: TProps): TContent;
}
