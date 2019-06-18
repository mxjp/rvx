import { DisposeLogic } from "./dispose-logic";

/**
 * Invoke dispose logic.
 */
export function dispose(logic: DisposeLogic): void {
	if (typeof logic === "function") {
		return logic();
	} else if (logic && typeof logic.dispose === "function") {
		return logic.dispose();
	}
}
