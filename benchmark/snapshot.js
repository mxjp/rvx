#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import yargsParser from "yargs-parser";
import { tscOut } from "../scripts/common.js";

const ctx = dirname(fileURLToPath(import.meta.url));
const repo = join(ctx, "..");
const snapshots = join(ctx, "src/snapshots");

const args = yargsParser(process.argv.slice(2), {
	boolean: ["build"],
	string: ["name"],
});

await mkdir(snapshots, { recursive: true });
const baseExists = await access(join(snapshots, "base.js")).then(() => true, () => false);
const name = args.name ?? (baseExists ? "update" : "base");
if (typeof name !== "string" || !/^[a-z0-9\-]+$/.test(name)) {
	throw new Error("invalid name");
}

if (args.build ?? true) {
	await exec(repo, "npm run build:es");
}

const MAIN = "rvx:benchmark:main";

const bundle = await rollup({
	input: MAIN,
	plugins: [
		{
			resolveId(id) {
				if (id === MAIN) {
					return id;
				}
			},
			load(id) {
				if (id === MAIN) {
					return [
						"core/index.js",
						"core/jsx/r17.js",
						"dom/index.js",
					].map(file => `export * from ${JSON.stringify(join(tscOut, file))};`).join("\n");
				}
			},
		},
	],
});

await bundle.write({
	format: "es",
	file: join(snapshots, name + ".js"),
});

console.log(`Created snapshot: ${name}.js`);

function exec(cwd, command) {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, { cwd, shell: true, stdio: "inherit" });
		proc.on("error", reject);
		proc.on("exit", (code, signal) => {
			if (code || signal) {
				reject(new Error(`Command failed: ${code || signal}`));
			} else {
				resolve();
			}
		});
	});
}
