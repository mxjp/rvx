import { DefaultContext } from "./context.js";

export type Env = typeof globalThis;
export const ENV = new DefaultContext<Env>(globalThis);
