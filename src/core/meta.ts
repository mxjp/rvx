
const SOURCES = new WeakMap();
const ROOTS = new WeakMap();

export function setSource(target: object, source: object) {
	SOURCES.set(target, source);
	ROOTS.set(target, ROOTS.get(source) ?? source);
}

export function unsetSource(target: object) {
	SOURCES.delete(target);
	ROOTS.delete(target);
}

export function getSource(target: object) {
	return SOURCES.get(target);
}

export function getRoot(target: object) {
	return ROOTS.get(target) ?? target;
}
