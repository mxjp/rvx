import { ENV, onLeak } from "rvx";
import { WINDOW } from "rvx/dom";
import { polyfillAnimationFrames } from "./polyfills/animation-frames.js";

ENV.default = WINDOW;

onLeak(() => {
	throw new Error("teardown leak");
});

polyfillAnimationFrames();
