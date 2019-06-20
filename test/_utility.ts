// tslint:disable: file-name-casing
import rvx, { Collection, Cycle, Disposable, ObservableLike, RenderContext, RenderContextBase } from "../src";

export function capture<T>(observable: ObservableLike<T>): {
	readonly events: ({ resolve: T } | { reject: any } | false)[];
	readonly disposable: Disposable;
} {
	const events = [];
	const disposable = observable.subscribe({
		resolve: value => void events.push({ resolve: value }),
		reject: value => void events.push({ reject: value }),
		end: () => void events.push(false)
	});
	return { events, disposable };
}

export function smallCollection() {
	return new Collection<string>((resolve, reject, end) => {
		resolve({ start: 0, count: 0, items: ["foo", "bar"] });
		resolve({ start: 0, count: 1, items: ["baz"] });
		resolve({ start: 1, count: 1, items: ["foo"] });
		resolve({ start: 1, count: 0, items: ["bar"] });
		end();
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

export function renderToHtml(content: any, context = rvx.context, cycle = context.cycle): () => string {
	const container = document.createElement("div");
	rvx.renderContentFor(container, content, context, cycle);
	return () => {
		return container.innerHTML;
	};
}
