import terser from "@rollup/plugin-terser";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";
import parseArgs from "yargs-parser";
import { gzipSync, brotliCompressSync } from "node:zlib";

const root = join(fileURLToPath(import.meta.url), "../..");
const args = parseArgs(process.argv.slice(2), {
	array: ["modules"],
	string: ["modules", "output"],
	boolean: ["readable", "minified", "gzip", "brotli", "types", "license"],
	alias: {
		modules: "m",
		output: "o",
	},
});

const modules = args.modules ?? ["core"];
const output = args.output ?? "./dist/rvx.custom";

const optionsHash = createHash("sha256").update(JSON.stringify({
	modules,
	output,
})).digest("base64url");

let entryContent = "";
for (const name of modules) {
	const dir = await stat(join(root, "src", name)).then(stats => {
		return stats.isDirectory();
	}, error => {
		if (error.code === "ENOENT") {
			return false;
		}
		throw error;
	});
	const path = `../dist/es/${name}${dir ? "/index" : ""}`;
	entryContent += `export * from ${JSON.stringify(path)};\n`;
}

const build = join(root, "build");

await mkdir(build, { recursive: true });

const entryBase = `entry.${optionsHash}`;
await writeFile(join(build, `${entryBase}.js`), entryContent);
await writeFile(join(build, `${entryBase}.d.ts`), entryContent);

const license = await readFile(join(root, "LICENSE"), "utf-8");
const banner = (args.license ?? true) ? [{
	banner: `/*!\n${license}*/`,
}] : [];

const format = {
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

{
	const bundle = await rollup({
		input: join(build, `${entryBase}.js`),
		onwarn,
	});
	if (args.readable ?? true) {
		await bundle.write({
			format: "es",
			file: join(root, output + ".js"),
			plugins: [
				banner,
				format,
			],
		});
	}
	if (args.minified ?? true) {
		await bundle.write({
			format: "es",
			file: join(root, output + ".min.js"),
			plugins: [
				terser(),
				{
					name: "rvx-compress-bundles",
					generateBundle(_options, bundles) {
						for (const name in bundles) {
							if (bundles[name].type !== "chunk") {
								continue;
							}
							const raw = Buffer.from(bundles[name].code, "utf-8");
							if (args.gzip) {
								const source = gzipSync(raw);
								this.emitFile({
									type: "asset",
									fileName: name + ".gz",
									source,
								});
							}
							if (args.brotli) {
								const source = brotliCompressSync(raw);
								this.emitFile({
									type: "asset",
									fileName: name + ".br",
									source,
								})
							}
						}
					},
				},
			],
		});
	}
}

if (args.types ?? true) {
	const bundle = await rollup({
		logLevel: "silent",
		input: join(build, `${entryBase}.d.ts`),
		plugins: [
			dts({
				tsconfig: join(root, "tsconfig-types.json"),
			}),
			banner,
			format,
		],
		onwarn,
	});
	await bundle.write({
		file: join(root, output + ".d.ts"),
		format: "es",
	});
}
