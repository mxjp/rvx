import { Context, render, View } from "rvx";
import { ASYNC, AsyncContext } from "rvx/async";
import { HistoryRouter, ROUTER } from "rvx/router";
import { App } from "./app.js";

async function main() {
	try {
		const asyncCtx = new AsyncContext();
		const app = render(Context.inject([
			ROUTER.with(new HistoryRouter()),
			ASYNC.with(asyncCtx),
		], App));

		if (document.readyState === "loading") {
			await new Promise(resolve => {
				document.addEventListener("DOMContentLoaded", resolve, { once: true });
			});
		}

		let start: Node | null = null;
		let end: Node | null = null;
		for (const node of document.body.childNodes) {
			if (node.nodeType === 8) {
				if (node.textContent === "app-start") {
					start = node;
				} else if (node.textContent === "app-end") {
					end = node;
				}
			}
		}

		if (start && end) {
			await asyncCtx.complete();
			app.appendTo(document.body);
			new View(u => u(start, end)).detach();
		} else {
			app.appendTo(document.body);
		}
	} finally {
		document.body.inert = false;
	}
}

void main();
