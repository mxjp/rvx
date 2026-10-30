import { $ } from "rvx";
import { normalize, Query, QueryInit, Router } from "rvx/router";

export class TestRouter implements Router {
	#events: unknown[];
	#path = $(normalize(""));
	#query = $<Query | undefined>(undefined);
	path = () => this.#path.value;
	query = () => this.#query.value;

	constructor(events?: unknown[]) {
		this.#events = events ?? [];
	}

	get root(): Router {
		return this;
	}

	get parent(): Router | undefined {
		return undefined;
	}

	#push(path: string, query?: QueryInit): void {
		this.#path.value = normalize(path);
		this.#query.value = Query.from(query);
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
