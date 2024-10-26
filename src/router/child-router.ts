import { Expression, get } from "../core/signals.js";
import { join } from "./path.js";
import { Query, QueryInit } from "./query.js";
import { Router } from "./router.js";

/**
 * A router that is located at a specific path and navigates within that path.
 */
export class ChildRouter implements Router {
	#parent: Router;
	#mountPath: string;
	#path: Expression<string>;

	/**
	 * Create a new child router.
	 *
	 * @param parent The parent router.
	 * @param mountPath The path this router is mounted at.
	 * @param path An expression to get the normalized rest path.
	 */
	constructor(parent: Router, mountPath: string, path: Expression<string>) {
		this.#parent = parent;
		this.#mountPath = mountPath;
		this.#path = path;
	}

	get root(): Router {
		return this.#parent.root;
	}

	get parent(): Router | undefined {
		return this.#parent;
	}

	get path(): string {
		return get(this.#path);
	}

	get query(): Query | undefined {
		return this.#parent.query;
	}

	push(path: string, query?: QueryInit): void {
		this.#parent.push(join(this.#mountPath, path), query);
	}

	replace(path: string, query?: QueryInit): void {
		this.#parent.replace(join(this.#mountPath, path), query);
	}
}
