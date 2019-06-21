import { CollectionLike } from "./collection-like";
import { CollectionPatch } from "./collection-patch";
import { Observable } from "./observable";
import { Observer } from "./observer";

const RESOLVED = Symbol("resolved");
const ITEMS = Symbol("items");

export class Collection<T> extends Observable<CollectionPatch<T>> implements CollectionLike<T> {
	private [RESOLVED] = false;
	private [ITEMS]: T[] = [];

	protected each(observer: Partial<Observer<CollectionPatch<T>>>) {
		if (this[RESOLVED] && observer.resolve) {
			observer.resolve({ start: 0, count: 0, items: Array.from(this[ITEMS]) });
		}
	}

	public resolve(value: CollectionPatch<T>) {
		this[RESOLVED] = true;
		this[ITEMS].splice(value.start, value.count, ...value.items);
		super.resolve(value);
	}

	public getItems(): readonly T[] {
		return this[RESOLVED] ? this[ITEMS] : null;
	}
}
