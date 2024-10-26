import { batch, sig } from "rvx";
import { formatQuery, normalize, Query, QueryInit, Router } from "rvx/router";

export class TestRouter implements Router {
	#events: unknown[];
	#path = sig(normalize(""));
	#query = sig<Query | undefined>(undefined);

	constructor(events?: unknown[]) {
		this.#events = events ?? [];
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

	#push(path: string, query?: QueryInit): void {
		batch(() => {
			this.#path.value = normalize(path);
			this.#query.value = Query.from(query);
		});
	}

	push(path: string, query?: QueryInit): void {
		this.#events.push(["push", path, query]);
		this.#push(path, query);
	}

	replace(path: string, query?: QueryInit): void {
		this.#events.push(["replace", path, query]);
		this.#push(path, query);
	}
}
