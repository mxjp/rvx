import { teardown } from "../core/lifecycle.js";
import { batch, sig } from "../core/signals.js";
import { join, relative } from "./path.js";
import { formatQuery, Query, QueryInit } from "./query.js";
import { Router } from "./router.js";

export interface HistoryRouterOptions {
	/**
	 * The current location is parsed when one of these events occur.
	 *
	 * @default ["popstate", "rvx:router:update"]
	 */
	parseEvents?: string[];

	/**
	 * The leading base path to ignore when matching routes.
	 *
	 * @default ""
	 */
	basePath?: string;
}

/**
 * A router that uses the history API.
 */
export class HistoryRouter implements Router {
	#basePath: string;
	#path = sig<string>(undefined!);
	#query = sig<Query | undefined>(undefined!);

	constructor(options?: HistoryRouterOptions) {
		this.#basePath = options?.basePath ?? "";
		const parseEvents = options?.parseEvents ?? ["popstate", "rvx:router:update"];
		for (const name of parseEvents) {
			window.addEventListener(name, this.#parse, { passive: true });
			teardown(() => window.removeEventListener(name, this.#parse));
		}
		this.#parse();
	}

	#parse = () => {
		batch(() => {
			this.#path.value = relative(this.#basePath, location.pathname);
			const query = location.search.slice(1);
			this.#query.value = query ? new Query(query) : undefined;
		});
	};

	#format(path: string, query?: QueryInit): string {
		let href = join(this.#basePath, path) || "/";
		if (query !== undefined) {
			href += "?" + formatQuery(query);
		}
		return href;
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
		history.pushState(null, "", this.#format(path, query));
		window.dispatchEvent(new CustomEvent("rvx:router:update"));
	}

	replace(path: string, query?: QueryInit): void {
		history.replaceState(null, "", this.#format(path, query));
		window.dispatchEvent(new CustomEvent("rvx:router:update"));
	}
}
