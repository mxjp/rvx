
const SOURCES = new WeakMap();
const ROOTS = new WeakMap();

/**
 * Set the direct source of truth.
 *
 * @param target The derived object.
 * @param source The source of truth.
 */
export function setSource(target: object, source: object) {
	SOURCES.set(target, source);
	ROOTS.set(target, ROOTS.get(source) ?? source);
}

/**
 * Unset a direct source of truth.
 */
export function unsetSource(target: object) {
	SOURCES.delete(target);
	ROOTS.delete(target);
}

/**
 * Get the direct source of truth if any.
 *
 * @param target The derived object.
 */
export function getSource(target: object): object | undefined {
	return SOURCES.get(target);
}

/**
 * Get the root source of truth.
 *
 * Note that the root is resolved when `setSource` is called.
 *
 * @param target The derived object.
 * @returns The root or the target itself if there is none.
 */
export function getRoot(target: object): object {
	return ROOTS.get(target) ?? target;
}
