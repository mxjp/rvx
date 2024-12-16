import { ENV } from "../core/env.js";
import { teardown } from "../core/lifecycle.js";
import { batch, sig } from "../core/signals.js";
import { normalize } from "./path.js";
import { Query, QueryInit } from "./query.js";
import { Router } from "./router.js";

export interface HashRouterOptions {
	/**
	 * The current location is parsed when one of these events occur.
	 *
	 * @default ["hashchange"]
	 */
	parseEvents?: string[];
}

/**
 * A router that uses `location.hash` as the path ignoring the leading `"#"`.
 *
 * Everything after the first `"?"` is treated as query parameters.
 */
export class HashRouter implements Router {
	#env = ENV.current;
	#path = sig<string>(undefined!);
	#query = sig<Query | undefined>(undefined);

	constructor(options?: HashRouterOptions) {
		const env = this.#env;
		const parseEvents = options?.parseEvents ?? ["hashchange"];
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
			const hash = this.#env.location.hash.slice(1);
			const queryStart = hash.indexOf("?");
			if (queryStart < 0) {
				this.#path.value = normalize(hash);
				this.#query.value = undefined;
			} else {
				this.#path.value = normalize(hash.slice(0, queryStart));
				this.#query.value = new Query(hash.slice(queryStart + 1));
			}
		});
	};

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
		this.#env.location.hash = `#${normalize(path)}${query === undefined ? "" : `?${typeof query === "string" ? query : new URLSearchParams(query)}`}`;
	}

	replace(path: string, query?: QueryInit): void {
		this.push(path, query);
	}
}
