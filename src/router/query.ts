
/**
 * Represents URL search parameters.
 */
export class Query {
	#raw: string;
	#params: URLSearchParams | undefined;

	constructor(raw: string, params?: URLSearchParams) {
		this.#raw = raw;
		this.#params = params;
	}

	static from(init: QueryInit): Query | undefined {
		if (init === undefined) {
			return undefined;
		}
		if (typeof init === "string") {
			return new Query(init);
		}
		const params = new URLSearchParams(init);
		return new Query(params.toString(), params);
	}

	get raw() {
		return this.#raw;
	}

	get params(): URLSearchParams {
		if (this.#params === undefined) {
			this.#params = new URLSearchParams(this.#raw);
		}
		return this.#params;
	}
}

export type QueryInit = ConstructorParameters<typeof URLSearchParams>[0];

/**
 * Format the specified query for use in a URL.
 *
 * Strings are returned as is.
 */
export function formatQuery(value: QueryInit): string {
	return typeof value === "string" ? value : new URLSearchParams(value).toString();
}
