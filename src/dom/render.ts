import { ASYNC, AsyncContext } from "../async/async-context.js";
import { Component } from "../core/component.js";
import { Context } from "../core/context.js";
import { ENV } from "../core/env.js";
import { capture } from "../core/lifecycle.js";
import { render } from "../core/render.js";
import { View } from "../core/view.js";
import { Node, WINDOW } from "./model.js";

export function renderToString(component: Component): string;
export function renderToString<P>(component: Component<P>, props: P): string;
export function renderToString<P>(component: Component<P>, props?: P): string {
	let html: string;
	capture(() => {
		ENV.inject(WINDOW as any, () => {
			const view = render(component(props!));
			const root = view.take();
			if (root instanceof Node) {
				html = root.outerHTML;
			} else {
				throw new Error("root is not an rvx dom node");
			}
		});
	})();
	return html!;
}

export async function renderToStringAsync<P>(component: Component<P>, props?: P): Promise<string> {
	const asyncCtx = new AsyncContext();
	let view: View;
	const dispose = capture(() => {
		Context.inject([
			ENV.with(WINDOW as any),
			ASYNC.with(asyncCtx),
		], () => {
			view = render(component(props!));
		});
	});
	try {
		await asyncCtx.complete();
		const root = view!.take();
		if (root instanceof Node) {
			return root.outerHTML;
		} else {
			throw new Error("root is not an rvx dom node");
		}
	} finally {
		dispose();
	}
}
