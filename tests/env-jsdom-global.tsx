import { JSDOM } from "jsdom";

const dom = new JSDOM();

for (const key of [
	"Comment",
	"customElements",
	"CustomEvent",
	"document",
	"DocumentFragment",
	"Element",
	"HTMLDivElement",
	"HTMLElement",
	"MouseEvent",
	"Node",
	"Range",
	"Text",
	"window",
]) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	(globalThis as any)[key] = dom.window[key];
}

const { onLeak } = await import("rvx");

onLeak(() => {
	throw new Error("teardown leak");
});
