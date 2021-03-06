// tslint:disable: file-name-casing
import { Collection, CollectionLike, CollectionPatch, Cycle, DisposeLogic, ObservableLike, RenderContext, RenderContextBase, RenderEngine } from "../src";
import { rvx } from "./_rvx";

export function capture<T>(observable: ObservableLike<T>): {
	readonly events: ({ resolve: T } | { reject: any })[];
	readonly resource: DisposeLogic;
} {
	const events = [];
	const resource = observable.subscribe({
		resolve: value => events.push({ resolve: value }),
		reject: value => events.push({ reject: value })
	});
	return { events, resource };
}

export function captureItems<T>(observable: CollectionLike<T>) {
	const events: ({ resolve: readonly T[] } | { reject: any })[] = [];
	const resource = observable.subscribe({
		resolve: () => events.push({ resolve: Array.from(observable.getItems()) }),
		reject: value => events.push({ reject: value })
	});
	return { events, resource };
}

export function smallCollection() {
	return new Collection<string>(observer => {
		observer.resolve({ start: 0, count: 0, items: ["foo", "bar"] });
		observer.resolve({ start: 0, count: 1, items: ["baz"] });
		observer.resolve({ start: 1, count: 1, items: ["foo"] });
		observer.resolve({ start: 1, count: 0, items: ["bar"] });
	});
}

export function captureErrorContext(parent?: RenderContext, cycle = new Cycle()) {
	const errors: any[] = [];
	const context = new class extends RenderContextBase {
		public readonly parent = parent;
		public readonly cycle = cycle;

		public error(value: any) {
			errors.push(value);
		}
	};
	return { context, errors };
}

export function renderToHtml(content: any, engine: RenderEngine = rvx, context = engine.context): () => string {
	const container = document.createElement("div");
	engine.renderContentFor(container, content, context, context.cycle);
	return () => {
		return container.innerHTML;
	};
}

export function macro() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

export class CollectionSubject<T> extends Collection<T> {
	public resolve(value: CollectionPatch<T>) {
		this.notifyResolve(value);
	}

	public reject(value: any) {
		this.notifyReject(value);
	}
}
