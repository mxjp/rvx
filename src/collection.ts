import { CollectionLike } from "./collection-like";
import { CollectionPatch } from "./collection-patch";
import { Disposable } from "./disposable";
import { Observable } from "./observable";
import { Observer } from "./observer";

const ITEMS = Symbol("items");

/**
 * Represents an observable collection.
 * When subscribed to, a collection emits a synchronous patch that represents the current state of the collection.
 */
export class Collection<T> extends Observable<CollectionPatch<T>> implements CollectionLike<T> {
	private [ITEMS]: T[] = [];

	public get items(): ReadonlyArray<T> {
		return this[ITEMS];
	}

	protected interceptResolve(resolve: (patch: CollectionPatch<T>) => void) {
		return (patch: CollectionPatch<T>) => {
			const startIndex = patch.start === false ? 0 : (patch.start + 1);
			this[ITEMS].splice(startIndex, (patch.end === false ? this[ITEMS].length : patch.end) - startIndex, ...patch.items);
			resolve(patch);
		};
	}

	protected subscribeResolved(observer: Partial<Observer<CollectionPatch<T>>>, disposable: Disposable) {
		if (observer.resolve && !this.isNew) {
			observer.resolve({ start: false, end: false, items: this[ITEMS] });
		}
		return super.subscribeResolved(observer, disposable);
	}

	public static items<T>(items: T[] | Iterable<T>) {
		return new Collection<T>((resolve, reject, end) => {
			resolve({
				start: false,
				end: false,
				items: Array.isArray(items) ? items : Array.from(items)
			});
			end();
		});
	}
}
