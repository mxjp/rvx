import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";

const LOGIC = Symbol("logic");

/**
 * Represents resources that have to be cleaned up manually.
 * This cycle can be reused after it is disposed.
 */
export class Cycle {
	public constructor(logic: DisposeLogic) {
		this.add(logic);
	}

	private [LOGIC] = new Set<DisposeLogic>();

	/**
	 * Add dispose logic to this resource.
	 */
	public add(logic: DisposeLogic) {
		if (logic) {
			this[LOGIC].add(logic);
		}
	}

	/**
	 * Try deleting dispose logic from this resource.
	 */
	public delete(logic: DisposeLogic) {
		this[LOGIC].delete(logic);
	}

	/**
	 * Dispose this resource.
	 */
	public dispose(): void {
		for (const logic of this[LOGIC]) {
			this[LOGIC].delete(logic);
			dispose(logic);
		}
	}
}
