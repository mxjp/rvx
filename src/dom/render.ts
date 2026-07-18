import { ASYNC, AsyncContext } from "../async/index.js";
import { capture, Context, ENV, render, View, type Component } from "../core/index.js";
import { Node, WINDOW } from "./model.js";

function renderDetachedView(view: View) {
	const { first, last } = view;
	if (!(first instanceof Node)) {
		throw new Error("root is not an rvx dom node");
	}
	if (first === last) {
		return first.outerHTML;
	} else {
		return first.parentNode!.outerHTML;
	}
}

/**
 * Render a component to HTML using rvx dom.
 */
export function renderToString(component: Component): string;
export function renderToString<P>(component: Component<P>, props: P): string;
export function renderToString<P>(component: Component<P>, props?: P): string {
	let html: string;
	capture(() => {
		ENV.provide(WINDOW, () => {
			const view = render(component(props!));
			html = renderDetachedView(view);
		});
	})();
	return html!;
}

/**
 * Render a component to HTML using rvx dom.
 *
 * This provides a new {@link AsyncContext} to wait for rendering to complete.
 */
export async function renderToStringAsync(component: Component): Promise<string>;
export async function renderToStringAsync<P>(component: Component<P>, props: P): Promise<string>;
export async function renderToStringAsync<P>(component: Component<P>, props?: P): Promise<string> {
	const asyncCtx = new AsyncContext();
	let view: View;
	const dispose = capture(() => {
		Context.provide([
			ENV.with(WINDOW),
			ASYNC.with(asyncCtx),
		], () => {
			view = render(component(props!));
		});
	});
	try {
		await asyncCtx.complete();
		return renderDetachedView(view!);
	} finally {
		dispose();
	}
}
