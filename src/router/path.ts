
/**
 * Normalize a path:
 * + Empty paths are represented as an empty string.
 * + Non-empty paths start with a slash.
 *
 * @param path The path to normalize.
 * @param preserveDir True to keep trailing slashes in non-empty paths. Default is `true`.
 * @returns The normalized path.
 */
export function normalize(path: string, preserveDir = true): string {
	if (path === "/" || path === "") {
		return "";
	}
	if (!preserveDir && path.endsWith("/")) {
		path = path.slice(0, path.length - 1);
	}
	if (path.startsWith("/")) {
		return path;
	}
	return "/" + path;
}

/**
 * Join two paths.
 *
 * Note, that this doesn't handle empty, ".." or "." parts.
 *
 * @param parent The parent path.
 * @param child The child path.
 * @param preserveDir True to keep trailing slashes. Default is `true`.
 * @returns A {@link normalize normalized} path.
 */
export function join(parent: string, child: string, preserveDir = true): string {
	child = normalize(child, preserveDir);
	parent = normalize(parent, child === "" ? preserveDir : false);
	return parent + child;
}

/**
 * Get a normalized relative path.
 *
 * Note, that this doesn't handle empty, ".." or "." parts, but inserts ".." parts if necessary.
 *
 * @param from The path from which the relative path starts.
 * @param to The path to which the relative path points.
 * @param preserveDir True to keep trailing slashes from the `to` path. Trailing slashes from the `from` path are always discarded. Default is `true`.
 * @returns A {@link normalize normalized} path.
 */
export function relative(from: string, to: string, preserveDir = true): string {
	const base = normalize(from, false);
	to = normalize(to, preserveDir);
	if (base.length === 0) {
		return to;
	}
	let basePos = 0;
	for (;;) {
		const sep = base.indexOf("/", basePos + 1);
		const end = sep < 0 ? base.length : sep;
		const part = base.slice(basePos, end);
		if (to === part || (to.startsWith(part, basePos) && to[basePos + part.length] === "/")) {
			basePos = end;
		} else {
			break;
		}
		if (sep < 0) {
			break;
		}
	}
	let back = 0;
	for (let i = basePos; i < base.length; i++) {
		if (base[i] === "/") {
			back++;
		}
	}
	to = to.slice(basePos);
	if (back === 0 && to === "/") {
		return "";
	}
	return "/..".repeat(back) + to;
}
