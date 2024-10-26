import { batch, sig } from "../core/signals.js";
import { normalize } from "./path.js";
import { formatQuery, Query, QueryInit } from "./query.js";
import { Router } from "./router.js";

export interface MemoryRouterOptions {
	/**
	 * The initial path.
	 */
	path?: string;

	/**
	 * The initial query.
	 */
	query?: QueryInit;
}

/**
 * A router that keeps it's state in memory instead of the actual browser location.
 */
export class MemoryRouter implements Router {
	#path = sig<string>(undefined!);
	#query = sig<Query | undefined>(undefined);

	constructor(options?: MemoryRouterOptions) {
		this.#path.value = normalize(options?.path ?? "");
		this.#query.value = options?.query === undefined ? undefined : new Query(formatQuery(options.query));
	}

	get root(): Router {
		return this;
	}

	get parent(): Router | undefined {
		return undefined;
	}

	get path(): string {
		return this.#path.value;
	}

	get query(): Query | undefined {
		return this.#query.value;
	}

	push(path: string, query?: QueryInit): void {
		batch(() => {
			this.#path.value = normalize(path);
			this.#query.value = query === undefined ? undefined : new Query(formatQuery(query));
		});
	}

	replace(path: string, query?: QueryInit): void {
		this.push(path, query);
	}
}
