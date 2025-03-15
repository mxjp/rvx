
/**
 * Utility type for any falsy value.
 */
export type Falsy = null | undefined | false | 0 | 0n | "";

/**
 * Common interface for components.
 */
export interface Component<Props = void, Content = unknown> {
	(props: Props): Content;
}
