
/**
 * Represents URL search parameters.
 */
export class Query {
	#raw: string;
	#params: URLSearchParams | undefined;

	constructor(raw: string) {
		this.#raw = raw;
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
