import { Context } from "../core/context.js";
import { Query, QueryInit } from "./query.js";

/**
 * Represents a path with optional query parameters that may change over time.
 */
export interface Router {
	/**
	 * The root router.
	 */
	get root(): Router;

	/**
	 * The parent of this router if any.
	 */
	get parent(): Router | undefined;

	/**
	 * Reactively get the remaining normalized path in this context.
	 */
	get path(): string;

	/**
	 * Reactively get the search parameters in this context.
	 */
	get query(): Query | undefined;

	/**
	 * Navigate to the specified path within the path this router is mounted in.
	 *
	 * @param path The path. This may not be normalized.
	 * @param query The query part.
	 *
	 * @example
	 * ```tsx
	 * import { extract } from "rvx";
	 * import { ROUTER } from "rvx/router";
	 *
	 * extract(ROUTER)!.root.push("/home");
	 * ```
	 */
	push(path: string, query?: QueryInit): void;

	/**
	 * Same as {@link push}, but replaces the URL in history if possible.
	 *
	 * @example
	 * ```tsx
	 * import { extract } from "rvx";
	 * import { ROUTER } from "rvx/router";
	 *
	 * extract(ROUTER)!.root.replace("/home");
	 * ```
	 */
	replace(path: string, query?: QueryInit): void;
}

/**
 * Context for the current router.
 */
export const ROUTER = new Context<Router>();
