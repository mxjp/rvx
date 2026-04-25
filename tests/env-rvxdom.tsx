import { ENV } from "rvx";
import { WINDOW } from "rvx/dom";
import { polyfillAnimationFrames } from "./polyfills/animation-frames.js";

ENV.default = WINDOW;

polyfillAnimationFrames();
