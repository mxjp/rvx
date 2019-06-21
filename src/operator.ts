import { ObservableLike } from "./observable-like";

/**
 * A function that creates an observable from an existing observable.
 */
export type Operator<T, U> = (source: ObservableLike<T>) => U;
