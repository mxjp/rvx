import { dispose } from "./dispose";
import { DisposeLogic } from "./dispose-logic";

const DISPOSED = Symbol("disposed");
const LOGIC = Symbol("logic");

/**
 * Represents resources that have to be cleaned up manually.
 * This can not be reused after it is disposed.
 */
export class Disposable {
	public constructor(logic: DisposeLogic) {
		this.add(logic);
	}

	private [DISPOSED] = false;
	private [LOGIC] = new Set<DisposeLogic>();

	public get disposed() {
		return this[DISPOSED];
	}

	/**
	 * Add dispose logic to this resource.
	 * If already disposed, the dispose logic will be invoked.
	 * @returns The result from invoking the dispose logic.
	 */
	public add(logic: DisposeLogic): void {
		if (logic) {
			if (this[DISPOSED]) {
				dispose(logic);
			} else {
				this[LOGIC].add(logic);
			}
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
		if (!this[DISPOSED]) {
			this[DISPOSED] = true;
			for (const logic of this[LOGIC]) {
				dispose(logic);
			}
		}
	}
}
