import terser from "@rollup/plugin-terser";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";

const root = join(fileURLToPath(import.meta.url), "../..");
const dist = join(root, "dist");
const tscOut = join(dist, "es");

const modules = [
	"async",
	"convert",
	"core",
	"dom",
	"element",
	"event",
	"id",
	"router",
	"store",
	"test",
];

const license = await readFile(join(root, "LICENSE"), "utf-8");
const bannerPlugin = {
	banner: `/*!\n${license}*/`,
};

const formatPlugin = {
	generateBundle(_options, bundle) {
		for (const name in bundle) {
			const asset = bundle[name];
			if (asset.type === "chunk") {
				let code = asset.code;
				code = code.replace(/^( {4})+/gm, c => "\t".repeat(c.length / 4));
				if (/\t (?!\*)/m.test(code)) {
					throw new Error("output indentation is broken");
				}
				asset.code = code;
			}
		}
	},
};

/**
 * @param {import("rollup").RollupLog} warn
 * @param {(log: import("rollup").RollupLog) => void} fallback
 */
function onwarn(warn, fallback) {
	if (warn.code === "CIRCULAR_DEPENDENCY") {
		process.exitCode = 1;
	}
	fallback(warn);
}

/**
 * @param {string} moduleName
 * @param {boolean} min
 */
function moduleFile(moduleName) {
	return moduleName === "core" ? "rvx" : `rvx.${moduleName}`;
}

const MODULE_PREFIX = "rvx-module:";

for (const moduleName of modules) {
	console.group("bundle:", moduleName);

	/**
	 * @param {string} id
	 * @param {string | undefined} parentId
	 */
	function resolveId(id, parentId) {
		if (parentId === undefined) {
			if (!isAbsolute(id)) {
				throw new Error(`relative id without parent: ${id}`);
			}
		} else {
			id = resolve(dirname(parentId), id);
		}
		const target = relative(tscOut, id);
		const targetModuleName = /^([^\\\/]+)[\\\/]/.exec(target)?.[1];
		if (!modules.includes(targetModuleName)) {
			throw new Error(`invalid module name: ${targetModuleName}`);
		}
		if (targetModuleName !== moduleName) {
			return MODULE_PREFIX + targetModuleName;
		}
	}

	const esBundle = await rollup({
		input: join(tscOut, moduleName, "index.js"),
		onwarn,
		external: id => {
			return id.startsWith("rvx-module:");
		},
		plugins: [
			{ resolveId },
		],
	});

	await esBundle.write({
		format: "es",
		file: join(dist, moduleFile(moduleName) + ".js"),
		paths: id => {
			if (id.startsWith(MODULE_PREFIX)) {
				return `./${moduleFile(id.slice(MODULE_PREFIX.length))}.js`;
			}
		},
		plugins: [
			bannerPlugin,
			formatPlugin,
		],
	});

	await esBundle.write({
		format: "es",
		file: join(dist, moduleFile(moduleName) + ".min.js"),
		paths: id => {
			if (id.startsWith(MODULE_PREFIX)) {
				return `./${moduleFile(id.slice(MODULE_PREFIX.length))}.min.js`;
			}
		},
		plugins: [
			terser(),
		],
	});

	const typesBundle = await rollup({
		logLevel: "silent",
		input: join(tscOut, moduleName, "index.d.ts"),
		external: (id, parentId) => {
			return resolveId(id, parentId)?.startsWith("rvx-module:") ?? false;
		},
		plugins: [
			dts({
				tsconfig: join(root, "tsconfig-types.json"),
				respectExternal: true,
			}),
			bannerPlugin,
			formatPlugin,
		],
		onwarn,
	});

	await typesBundle.write({
		file: join(dist, moduleFile(moduleName) + ".d.ts"),
		paths: (id) => {
			id = resolveId(id) ?? id;
			if (id.startsWith(MODULE_PREFIX)) {
				return `./${moduleFile(id.slice(MODULE_PREFIX.length))}.js`;
			}
		},
	});

	await typesBundle.write({
		file: join(dist, moduleFile(moduleName) + ".min.d.ts"),
		paths: (id) => {
			id = resolveId(id) ?? id;
			if (id.startsWith(MODULE_PREFIX)) {
				return `./${moduleFile(id.slice(MODULE_PREFIX.length))}.min.js`;
			}
		},
	});

	console.groupEnd();
}
