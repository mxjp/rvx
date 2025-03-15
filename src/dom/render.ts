import { ASYNC, AsyncContext } from "../async/async-context.js";
import { Context } from "../core/context.js";
import { ENV } from "../core/env.js";
import { capture } from "../core/lifecycle.js";
import type { Component } from "../core/types.js";
import { render, View } from "../core/view.js";
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

export function renderToString(component: Component): string;
export function renderToString<P>(component: Component<P>, props: P): string;
export function renderToString<P>(component: Component<P>, props?: P): string {
	let html: string;
	capture(() => {
		ENV.inject(WINDOW, () => {
			const view = render(component(props!));
			html = renderDetachedView(view);
		});
	})();
	return html!;
}

export async function renderToStringAsync<P>(component: Component<P>, props?: P): Promise<string> {
	const asyncCtx = new AsyncContext();
	let view: View;
	const dispose = capture(() => {
		Context.inject([
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
