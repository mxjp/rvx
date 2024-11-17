import { Context } from "./context.js";

/**
 * **This is experimental API.**
 */
export type Env = typeof globalThis;

/**
 * **This is experimental API.**
 *
 * A context that is used to access all DOM related APIs.
 *
 * This can be used to run rvx applications in non browser environments.
 */
export const ENV = new Context<Env>(globalThis);
