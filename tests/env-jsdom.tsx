import { JSDOM } from "jsdom";
import { ENV } from "rvx";
import { polyfillAnimationFrames } from "./polyfills/animation-frames.js";

ENV.default = new JSDOM().window;

polyfillAnimationFrames();
