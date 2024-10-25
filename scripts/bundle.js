import terser from "@rollup/plugin-terser";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";
import parseArgs from "yargs-parser";

const root = join(fileURLToPath(import.meta.url), "../..");
const args = parseArgs(process.argv.slice(2), {
	array: ["modules"],
	string: ["modules", "output"],
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
const banner = `/*!\n${license}*/`;

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

{
	const bundle = await rollup({
		logLevel: "silent",
		input: join(build, `${entryBase}.js`),
	});
	await bundle.write({
		format: "es",
		file: join(root, output + ".js"),
		plugins: [
			{ banner },
			format,
		],
	});
	await bundle.write({
		format: "es",
		file: join(root, output + ".min.js"),
		plugins: [
			terser(),
			{ banner },
		],
	});
}

{
	const bundle = await rollup({
		logLevel: "silent",
		input: join(build, `${entryBase}.d.ts`),
		plugins: [
			dts({
				tsconfig: join(root, "tsconfig-types.json"),
			}),
			{ banner },
			format,
		],
	});
	await bundle.write({
		file: join(root, output + ".d.ts"),
		format: "es",
	});
}
