import { $ } from "../core/index.js";
import { normalize } from "./path.js";
import { Query, QueryInit } from "./query.js";
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

	parent?: Router;
}

/**
 * A router that keeps its state in memory instead of the browser location.
 */
export class MemoryRouter implements Router {
	#parent: Router | undefined;
	#path = $<string>(undefined!);
	#query = $<Query | undefined>(undefined);
	path = () => this.#path.value;
	query = () => this.#query.value;

	constructor(options?: MemoryRouterOptions) {
		this.#parent = options?.parent;
		this.#path.value = normalize(options?.path ?? "");
		this.#query.value = Query.from(options?.query);
	}

	get root(): Router {
		return this.#parent?.root ?? this;
	}

	get parent(): Router | undefined {
		return this.#parent;
	}

	push(path: string, query?: QueryInit): void {
		this.#path.value = normalize(path);
		this.#query.value = Query.from(query);
	}

	replace(path: string, query?: QueryInit): void {
		this.push(path, query);
	}
}
