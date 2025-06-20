import { JSDOM } from "jsdom";
import { polyfillAnimationFrames } from "./polyfills/animation-frames.js";

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
	(globalThis as any)[key] = dom.window[key];
}

const { onLeak } = await import("rvx");

onLeak(() => {
	throw new Error("teardown leak");
});

polyfillAnimationFrames();
