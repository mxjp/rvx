import { JSDOM } from "jsdom";
import { ENV, onLeak } from "rvx";
import { polyfillAnimationFrames } from "./polyfills/animation-frames.js";

ENV.default = new JSDOM().window;

onLeak(() => {
	throw new Error("teardown leak");
});

polyfillAnimationFrames();
