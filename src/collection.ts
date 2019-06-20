import { CollectionLike } from "./collection-like";
import { CollectionPatch } from "./collection-patch";
import { Disposable } from "./disposable";
import { Observable } from "./observable";
import { Observer } from "./observer";

const RESOLVED = Symbol("hasItems");
const ITEMS = Symbol("items");

/**
 * Represents an observable collection.
 * When subscribed to, a collection emits a synchronous patch that represents the current state of the collection.
 */
export class Collection<T> extends Observable<CollectionPatch<T>> implements CollectionLike<T> {
	private [RESOLVED] = false;
	private [ITEMS]: T[] = [];

	public get items(): ReadonlyArray<T> {
		return this[ITEMS];
	}

	protected interceptResolve(resolve: (patch: CollectionPatch<T>) => void) {
		return (patch: CollectionPatch<T>) => {
			this[RESOLVED] = true;
			this[ITEMS].splice(patch.start, patch.count, ...patch.items);
			resolve(patch);
		};
	}

	protected subscribeResolved(observer: Partial<Observer<CollectionPatch<T>>>, disposable: Disposable) {
		if (observer.resolve && this[RESOLVED]) {
			observer.resolve({ start: 0, count: 0, items: this[ITEMS] });
		}
		return super.subscribeResolved(observer, disposable);
	}

	public static items<T>(items: T[] | Iterable<T>) {
		return new Collection<T>((resolve, reject, end) => {
			resolve({ start: 0, count: 0, items: Array.isArray(items) ? items : Array.from(items) });
			end();
		});
	}
}
