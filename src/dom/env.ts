import { ENV } from "../core/env.js";
import { WINDOW_MARKER } from "./internals/window-marker.js";

/**
 * Check if rvx dom is used in the current context.
 */
export function isRvxDom(): boolean {
	const current = ENV.current;
	return current !== null
		&& typeof current === "object"
		&& (current as any)[WINDOW_MARKER] === true;
}
