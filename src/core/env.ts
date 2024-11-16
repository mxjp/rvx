import { Context } from "./context.js";

export type Env = typeof globalThis;

/**
 * A context that is used to access all DOM related APIs.
 *
 * This can be used to run rvx applications in non browser environments.
 */
export const ENV = new Context<Env>(globalThis);
