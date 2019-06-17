
const DISPOSED = Symbol("disposed");
const LOGIC = Symbol("logic");

export type DisposeLogic = { dispose(): Promise<any> | void } | (() => Promise<any> | void) | void;

/**
 * Invoke dispose logic.
 * @param logic
 */
export function dispose(logic: DisposeLogic): Promise<any> | void {
	if (typeof logic === "function") {
		return logic();
	} else if (logic && typeof logic.dispose === "function") {
		return logic.dispose();
	}
}

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
	 * @param logic
	 */
	public add(logic: DisposeLogic) {
		if (logic) {
			this[LOGIC].add(logic);
		}
	}

	/**
	 * Try deleting dispose logic from this resource.
	 * @param logic
	 */
	public delete(logic: DisposeLogic) {
		this[LOGIC].delete(logic);
	}

	/**
	 * Dispose this resource.
	 */
	public dispose(): Promise<any> | void {
		const actions = [];
		for (const logic of this[LOGIC]) {
			this[LOGIC].delete(logic);
			const action = dispose(logic);
			if (action) {
				actions.push(action);
			}
		}
		if (actions.length > 0) {
			return Promise.all(actions);
		}
	}
}

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
	 * @param logic
	 * @returns The result from invoking the dispose logic.
	 */
	public add(logic: DisposeLogic): Promise<any> | void {
		if (logic) {
			if (this[DISPOSED]) {
				return dispose(logic);
			} else {
				this[LOGIC].add(logic);
			}
		}
	}

	/**
	 * Try deleting dispose logic from this resource.
	 * @param logic
	 */
	public delete(logic: DisposeLogic) {
		this[LOGIC].delete(logic);
	}

	/**
	 * Dispose this resource.
	 */
	public dispose(): Promise<any> | void {
		if (!this[DISPOSED]) {
			this[DISPOSED] = true;
			const actions = [];
			for (const logic of this[LOGIC]) {
				const action = dispose(logic);
				if (action) {
					actions.push(action);
				}
			}
			if (actions.length > 0) {
				return Promise.all(actions);
			}
		}
	}
}
