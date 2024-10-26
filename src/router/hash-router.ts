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
	#path = sig<string>(undefined!);
	#query = sig<Query | undefined>(undefined);

	constructor(options?: HashRouterOptions) {
		const parseEvents = options?.parseEvents ?? ["hashchange"];
		for (const name of parseEvents) {
			window.addEventListener(name, this.#parse, { passive: true });
			teardown(() => window.removeEventListener(name, this.#parse));
		}
		this.#parse();
	}

	#parse = () => {
		batch(() => {
			const hash = location.hash.slice(1);
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
		location.hash = `#${normalize(path)}${query === undefined ? "" : `?${typeof query === "string" ? query : new URLSearchParams(query)}`}`;
	}

	replace(path: string, query?: QueryInit): void {
		this.push(path, query);
	}
}
