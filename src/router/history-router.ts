import { ENV } from "../core/env.js";
import { teardown } from "../core/lifecycle.js";
import { $, batch } from "../core/signals.js";
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
	#env = ENV.current;
	#basePath: string;
	#path = $<string>(undefined!);
	#query = $<Query | undefined>(undefined!);

	constructor(options?: HistoryRouterOptions) {
		const env = this.#env;
		this.#basePath = options?.basePath ?? "";
		const parseEvents = options?.parseEvents ?? ["popstate", "rvx:router:update"];
		const parse = this.parse.bind(this);
		for (const name of parseEvents) {
			env.window.addEventListener(name, parse, { passive: true });
			teardown(() => env.window.removeEventListener(name, parse));
		}
		this.parse();
	}

	/**
	 * Called to parse & update this router's state from the current browser location.
	 */
	parse() {
		batch(() => {
			const env = this.#env;
			this.#path.value = relative(this.#basePath, env.location.pathname);
			this.#query.value = env.location.search.length > 0 ? new Query(env.location.search.slice(1)) : undefined;
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
		const env = this.#env;
		env.history.pushState(null, "", this.#format(path, query));
		env.window.dispatchEvent(new env.CustomEvent("rvx:router:update"));
	}

	replace(path: string, query?: QueryInit): void {
		const env = this.#env;
		env.history.replaceState(null, "", this.#format(path, query));
		env.window.dispatchEvent(new env.CustomEvent("rvx:router:update"));
	}
}
