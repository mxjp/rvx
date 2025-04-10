import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(fileURLToPath(import.meta.url), "../..");
export const dist = join(root, "dist");
export const tscOut = join(dist, "es");

/**
 * @param {string} moduleName
 */
export function bundleName(moduleName) {
	return moduleName === "core" ? "rvx" : `rvx.${moduleName}`;
}

export function importName(moduleName) {
	return moduleName === "core" ? "rvx" : `rvx/${moduleName}`;
}

export const moduleNames = [
	"core",
	"async",
	"convert",
	"dom",
	"element",
	"event",
	"router",
	"store",
	"test",
];
