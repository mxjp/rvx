import { Context } from "./context.js";

interface EnvContext extends Context<unknown> {
	get current(): typeof globalThis;
}

/**
 * **This is experimental API.**
 *
 * A context that is used to access all DOM related APIs.
 *
 * This can be used to run rvx applications in non browser environments.
 */
export const ENV: EnvContext = new Context(globalThis);
