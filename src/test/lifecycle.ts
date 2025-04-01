import { TEARDOWN_STACK } from "../core/internals/teardown-stack.js";
import { TeardownHook } from "../core/lifecycle.js";

export type TeardownLeakHook = (hook: TeardownHook) => void;

/**
 * Register a hook to be called when any teardown hooks are registered outside of any capture calls.
 *
 * Errors thrown from the leak hook will be thrown by the **teardown** calls.
 */
export function onTeardownLeak(hook: TeardownLeakHook): void {
	if (TEARDOWN_STACK.length > 0) {
		// onTeardownLeak must only be called once and outside of any capture calls:
		throw new Error("G4");
	}
	TEARDOWN_STACK.push({ push: hook });
}
