import { CollectionLike } from "./collection-like";
import { ObservableLike } from "./observable-like";

/**
 * A function that creates an observable collection from an existing observable.
 */
export type CollectionOperator<T, U> = (source: ObservableLike<T>) => CollectionLike<U>;
